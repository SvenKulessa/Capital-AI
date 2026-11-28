import { createHandler } from './mcp.mjs';
const handle=createHandler();
const LIMIT=65536;
let line=Buffer.alloc(0),discard=false;
function send(v){if(v!==null)process.stdout.write(JSON.stringify(v)+'\n');}
for await(const chunk of process.stdin){
  let start=0;
  while(start<chunk.length){
    const newline=chunk.indexOf(10,start),end=newline===-1?chunk.length:newline;
    if(!discard){
      if(line.length+end-start>LIMIT){discard=true;line=Buffer.alloc(0);send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request too large'}});}
      else line=Buffer.concat([line,chunk.subarray(start,end)]);
    }
    if(newline!==-1){if(!discard){try{send(handle(JSON.parse(line.toString('utf8'))));}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}}line=Buffer.alloc(0);discard=false;}
    start=newline===-1?chunk.length:newline+1;
  }
}
