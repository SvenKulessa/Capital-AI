import { demo, PRODUCT } from './index.mjs';
import { parseHandoff, validateOwnerHandoff } from './handoff.mjs';
const args=process.argv.slice(2);
try {
  if(args.length!==1||!['demo','manifest','inspect-handoff','owner-handoff'].includes(args[0])) throw Error('USAGE');
  if(args[0]==='demo'||args[0]==='manifest') console.log(JSON.stringify(args[0]==='demo'?demo():PRODUCT,null,2));
  else {
    const chunks=[]; let total=0;
    for await(const chunk of process.stdin){ total+=chunk.length; if(total>16384)throw Error('INVALID_HANDOFF_SIZE'); chunks.push(chunk); }
    const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));
    if(args[0]==='owner-handoff') process.stdout.write(validateOwnerHandoff(raw));
    else console.log(JSON.stringify(parseHandoff(raw),null,2));
  }
} catch { console.error('EIF: invalid command or handoff; no output produced'); process.exitCode=2; }
