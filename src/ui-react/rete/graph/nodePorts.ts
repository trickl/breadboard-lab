export type PortLike = { multipleConnections?: boolean };

export type NodeWithPorts = {
  id: string;
  inputs?: Record<string, PortLike>;
  outputs?: Record<string, PortLike>;
};
