export type Payload = {
  target: string;
  caller: string;
  sdp: string;
};

export type Incoming = {
  target: string;
  candidate: string;
};
