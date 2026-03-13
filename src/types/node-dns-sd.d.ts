declare module 'node-dns-sd' {
  export function discover(options: { 
    name: string; 
    wait?: number;
    timeout?: number;
  }): Promise<any[]>;
  const dnsSd: {
    discover: (options: { 
      name: string; 
      wait?: number;
      timeout?: number;
    }) => Promise<any[]>;
  };
  export default dnsSd;
}
