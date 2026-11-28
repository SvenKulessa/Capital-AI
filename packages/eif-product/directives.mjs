// EIF offline reference index; NOT an authorization source or a second skill registry.
// References describe the inspected baseline only. Consumers must revalidate live sources.
const BASELINE = 'd18143b0b5291a1b1119699c82114b3e8a44a725';
const GROUPS = {
  "governance": {
    "source": "AGENTS.md",
    "ids": [
      "SOLO_MAINTAINER_FLOW@2",
      "AUTONOMOUS_EXECUTION_FIRST"
    ]
  },
  "execution": {
    "source": "AGENTS.md",
    "ids": [
      "PROCESS_ACCELERATION@1",
      "STRUCTURED_CHAT_EXECUTION@1",
      "CAPITAL_AI_ERROR_RECOVERY@1",
      "GLOBAL_EXECUTION_GROWTH_VISUAL@2"
    ]
  },
  "evidence": {
    "source": "AGENTS.md",
    "ids": [
      "GLOBAL_EVIDENCE_VISUAL@1"
    ]
  },
  "infrastructure": {
    "source": "AGENTS.md",
    "ids": [
      "ACODEX_ON_DEMAND_SYNC@1",
      "ACODEX_TERMINAL_STATUS_BRANDING@1",
      "ACODE_ACOPY_INTEGRATION@1",
      "CAPITAL_AI_ACODE_SHARED_DELIVERY@1",
      "CAPITAL_AI_DRIVE_ARTIFACT_ROUTING@1"
    ]
  },
  "resume": {
    "source": ".ai/prompts/000-execution-first.prompt.md",
    "ids": [
      "ADAPTIVE_CHAT_EXECUTION@3",
      "SOLO2",
      "LANGGRAPH_RAG",
      "UNIVERSE_7",
      "COMMERCIAL_READINESS_FIRST"
    ]
  },
  "skills": {
    "source": ".agents/skills/registry.json",
    "ids": [
      "CAPITAL_AI_DOMAIN_SKILLS@1",
      "CAPITAL_AI_ADVISORY_ROUTING@1",
      "CAPITAL_AI_PROMPT_CONTRACT_REFS@1",
      "CAPITAL_AI_SKILL_BUNDLE_CATALOG@1",
      "CAPITAL_AI_SKILL_GOVERNANCE@1",
      "CAPITAL_AI_SKILL_SOURCE_INVENTORY@1",
      "CAPITAL_AI_SPECIALIST_ROUTING@1",
      "CAPITAL_AI_TASK_SKILL_ROUTING@1"
    ]
  },
  "application": {
    "source": ".agents/app.prompt.json",
    "ids": [
      "CAPITAL_AI_ADAPTIVE_CHAT_RESUME@1",
      "CAPITAL_AI_APPLICATION_EXECUTION_PROMPT@1",
      "CAPITAL_AI_SOLO2_DOMAIN_LOOP@1",
      "CAPITAL_AI_TEN_PR_EFFICIENCY_MILESTONE@1"
    ]
  }
};
const CANDIDATES = [
  "SOLO2-CHAT@1",
  "PROJECT_EXECUTION_CORE@3",
  "PROCESS_ACCELERATION@2",
  "ADAPTIVE_CHAT_EXECUTION@3.4",
  "ADAPTIVE_CHAT_EXECUTION@3.5",
  "ADAPTIVE_CHAT_EXECUTION@3.6",
  "ADAPTIVE_CHAT_EXECUTION@3.7",
  "ADAPTIVE_IMPROVEMENT@1",
  "AUTONOMOUS_NAVIGATOR@1",
  "ADAPTIVE_ROLLBACK@1",
  "EVIDENCE_INTELLIGENCE@1",
  "EVIDENCE_BASED_STATUS_PROMOTION@1",
  "DOCUMENT_HYGIENE@1",
  "COMMERCIAL_READINESS@1",
  "COMMERCIAL_READINESS@2",
  "SEO_AGENT_OPTIMIZATION@1",
  "DISTRIBUTION_INTELLIGENCE@1",
  "PLUGIN_PRODUCT_DISCOVERY@1",
  "CAI-X-GROWTH@1",
  "CAI-ZERO-OPEN@1",
  "POCKETDEFEND_REBRANDING@1"
];
const LINKS = {
  'GLOBAL_EXECUTION_GROWTH_VISUAL@2':['SOLO_MAINTAINER_FLOW@2','PROCESS_ACCELERATION@1','STRUCTURED_CHAT_EXECUTION@1','GLOBAL_EVIDENCE_VISUAL@1'],
  'GLOBAL_EVIDENCE_VISUAL@1':['STRUCTURED_CHAT_EXECUTION@1','UNIVERSE_7','CAPITAL_AI_SOLO2_DOMAIN_LOOP@1'],
  'ADAPTIVE_CHAT_EXECUTION@3':['CAPITAL_AI_ADAPTIVE_CHAT_RESUME@1','CAPITAL_AI_SOLO2_DOMAIN_LOOP@1','CAPITAL_AI_DOMAIN_SKILLS@1','LANGGRAPH_RAG'],
  'CAPITAL_AI_SOLO2_DOMAIN_LOOP@1':['CAPITAL_AI_PROMPT_CONTRACT_REFS@1','CAPITAL_AI_ERROR_RECOVERY@1'],
  'COMMERCIAL_READINESS_FIRST':['PROCESS_ACCELERATION@1','GLOBAL_EVIDENCE_VISUAL@1'],
  'CAPITAL_AI_ACODE_SHARED_DELIVERY@1':['ACODE_ACOPY_INTEGRATION@1','ACODEX_ON_DEMAND_SYNC@1','CAPITAL_AI_DRIVE_ARTIFACT_ROUTING@1']
};
const rows = [
  ...Object.entries(GROUPS).flatMap(([group,{source,ids}])=>ids.map(id=>({id,group,source,status:'SOURCE_REFERENCE'}))),
  {id:'SOLO_MAINTAINER_FLOW@1',group:'governance',source:'AGENTS.md',status:'SUPERSEDED',replacement:'SOLO_MAINTAINER_FLOW@2'},
  ...CANDIDATES.map(id=>({id,group:'candidate',source:null,status:'NOT_PROVEN'}))
];
const index = new Map(rows.map(row=>[row.id,row]));
function describe(row) {return {...row,related:[...(LINKS[row.id]||[])]};}
function envelope() {return {schema:'CAPITAL_AI_EIF_DIRECTIVE_INDEX@1',baseline:BASELINE,authority:'AGENTS.md',evidenceClass:'BASELINE_REFERENCE_ONLY',permissionExpansion:false,executionStarted:false,commercialEligible:false,runtimeActivation:'NOT_PROVEN'};}
export function directiveCatalog() {return {...envelope(),directives:rows.map(describe)};}
export function inspectDirectives(input) {
  if(!Array.isArray(input)||input.length<1||input.length>64||input.some(id=>typeof id!=='string'||id.length>100||!index.has(id))) throw Error('INVALID_OR_UNKNOWN_DIRECTIVE');
  const ids=[...new Set(input)];
  const directives=ids.map(id=>describe(index.get(id)));
  return {...envelope(),status:directives.some(row=>row.status!=='SOURCE_REFERENCE')?'REVIEW_REQUIRED':'REFERENCE_ONLY',directives};
}
