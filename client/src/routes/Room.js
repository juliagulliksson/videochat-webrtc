import React, { useRef, useEffect } from "react";
import io from "socket.io-client";
import { isCallSignatureDeclaration, preProcessFile } from "typescript";

const Room = (props) => {
  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();
  const socketRef = useRef();
  const otherUser = useRef();
  const userStream = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        console.log(stream);
        userVideo.current.srcObject = stream;
        userStream.current = stream;

        socketRef.current = io.connect("/");
        socketRef.current.emit("join room", props.match.params.roomID);

        socketRef.current.on("other user", (userID) => {
          callUser(userID);
          otherUser.current = userID;
        });

        socketRef.current.on("user joined", (userID) => {
          otherUser.current = userID;
        });

        socketRef.current.on("offer", handleReceiveCall);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
      });
  }, []);

  const callUser = (userID) => {
    peerRef.current = createPeer(userID);
    /** Use getTracks method that exists on the stream connected to userStream.current
     Returns an array: one track for video, one for audio **/
    userStream.current.getTracks().forEach((track) => {
      // Call addTrack method with the track (audio / video) and the stream that the track is part of
      return peerRef.current.addTrack(track, userStream.current);
    });
  };

  const createPeer = (userID) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });

    peer.onicecandidate = handleICECandidateEvent;
    // The ontrack event fires when we are recieving the remote peer and have a proper connection, and the remote peer is sending their stream
    peer.ontrack = handleTrackEvent;
    // When one user initiates the call, the onnegotiationneeded event is fired
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

    return peer;
  };

  const handleNegotiationNeededEvent = (userID) => {
    //The current user is making sending offer
    peerRef.current
      .createOffer()
      .then((offer) => {
        return peerRef.current.setLocalDescription(offer);
      })
      .then(() => {
        const payload = createPayload(userID);
        socketRef.current.emit("offer", payload);
      })
      .catch((e) => console.log(e));
  };

  const handleReceiveCall = (incoming) => {
    // Current user is receiving call, so no need to pass userID
    peerRef.current = createPeer();
    //sdp represents offer data
    const description = new RTCSessionDescription(incoming.sdp);
    // When sending offer, setLocalDescription, but when receiving offer, setRemoteDescription
    peerRef.current
      .setRemoteDescription(description)
      .then(() => {
        userStream.current
          .getTracks()
          .forEach((track) =>
            peerRef.current.addTrack(track, userStream.current)
          );
      })
      .then(() => {
        return peerRef.current.createAnswer();
      })
      .then((answer) => {
        return peerRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = createPayload(incoming.caller);
        // Answer back to the user sending the offer
        socketRef.current.emit("answer", payload);
      });
  };

  const handleAnswer = (message) => {
    const description = new RTCSessionDescription(message.sdp);
    peerRef.current
      .setRemoteDescription(description)
      .catch((e) => console.log(e));
  };

  const handleICECandidateEvent = (e) => {
    if (e.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: e.candidate,
      };
      socketRef.current.emit("ice-candidate", payload);
    }
  };

  const handleNewICECandidateMsg = (incoming) => {
    const candidate = new RTCIceCandidate(incoming);
    peerRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
  };

  const handleTrackEvent = (e) => {
    // Set partner (remote peer) video stream
    partnerVideo.current.srcObject = e.streams[0];
  };

  const createPayload = (target) => {
    return {
      target,
      caller: socketRef.current.id,
      sdp: peerRef.current.localDescription,
    };
  };

  return (
    <div>
      <video autoPlay muted="muted" ref={userVideo}></video>
      <video autoPlay ref={partnerVideo}></video>
    </div>
  );
};

export default Room;
