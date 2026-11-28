// Minimal legacy MCP 2025-11-25 stdio demo; no generic filesystem or execution tools.
import { demo } from './index.mjs';
const TOOL={name:'eif_demo',description:'Evaluate fixed synthetic document hygiene fixtures offline; no real authority or customer evidence.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}};
const error=(id,code,message)=>({jsonrpc:'2.0',id, error:{code,message}});
export function createHandler(){
  let state='new';
  return req=>{
    if(!req||typeof req!=='object'||Array.isArray(req)||req.jsonrpc!=='2.0'||typeof req.method!=='string'||('id'in req && !(typeof req.id==='string'||Number.isSafeInteger(req.id)))) return error(null,-32600,'Invalid Request');
    const {id,method,params}=req;
    if(id===undefined){if(method==='notifications/initialized'&&state==='initializing')state='ready';return null;}
    const ok=result=>({jsonrpc:'2.0',id,result});
    if(method==='initialize'&&state==='new'){
      if(!params||typeof params.protocolVersion!=='string'||!params.clientInfo||!params.capabilities)return error(id,-32602,'Invalid params');
      state='initializing';return ok({protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'capital-ai-eif-demo',version:'0.2.0'}});
    }
    if(method==='ping')return ok({});
    if(state!=='ready')return error(id,-32000,'Not initialized');
    if(method==='tools/list')return ok({tools:[TOOL]});
    if(method==='tools/call'){
      if(params?.name!=='eif_demo')return error(id,-32602,'Unknown tool');
      const a=params.arguments??{};
      if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).length)return error(id,-32602,'No arguments accepted');
      return ok({content:[{type:'text',text:JSON.stringify(demo())}]});
    }
    return error(id,-32601,'Method not found');
  };
}
