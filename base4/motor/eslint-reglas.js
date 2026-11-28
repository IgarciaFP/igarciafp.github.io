/* ESLint solo analiza; nunca evalúa el código del alumno. */
(function(root){
'use strict';
const Linter=typeof module==='object'&&module.exports?require('./vendor/eslint-10.16.0.min.js').Linter:root.eslint.Linter;
const linter=new Linter(),types=new Set(['WhileStatement','DoWhileStatement','ForStatement']);
function children(node){
 const out=[];
 for(const key of Object.keys(node)){
  if(['parent','tokens','comments','loc','range'].includes(key))continue;
  const value=node[key];
  for(const item of Array.isArray(value)?value:[value])if(item&&typeof item.type==='string')out.push(item);
 }
 return out;
}
function truth(node){
 if(!node)return undefined;
 if(node.type==='Literal')return !!node.value;
 if(node.type==='UnaryExpression'&&node.operator==='!'){const value=truth(node.argument);return value===undefined?undefined:!value;}
 return undefined;
}
function canExit(loop){
 function exits(node){
  if(!node||/^(Function|ArrowFunction)/.test(node.type))return false;
  if(node.type==='BreakStatement'){
   let target=node.parent;
   while(target){
    if(node.label){if(target.type==='LabeledStatement'&&target.label.name===node.label.name)return target.range[0]<=loop.range[0]&&target.range[1]>=loop.range[1];}
    else if(types.has(target.type)||['ForOfStatement','ForInStatement','SwitchStatement'].includes(target.type))return target===loop;
    target=target.parent;
   }
   return false;
  }
  if(node.type==='ReturnStatement')return true;
  if(node.type==='ThrowStatement'){
   let parent=node.parent;
   while(parent&&parent!==loop){if(parent.type==='TryStatement'&&parent.handler&&node.range[0]>=parent.block.range[0]&&node.range[1]<=parent.block.range[1])return false;parent=parent.parent;}
   return true;
  }
  if(node.type==='IfStatement'){
   const value=truth(node.test);
   return value===true?exits(node.consequent):value===false?exits(node.alternate):exits(node.consequent)||exits(node.alternate);
  }
  if(types.has(node.type)&&node!==loop&&node.type!=='DoWhileStatement'&&truth(node.test)===false)return false;
  if(node.type==='BlockStatement'){
   for(const statement of node.body){if(exits(statement))return true;if(['ContinueStatement','BreakStatement','ReturnStatement','ThrowStatement'].includes(statement.type))break;}
   return false;
  }
  return children(node).some(exits);
 }
 return exits(loop.body);
}
function verify(code,sourceType='script'){
 const messages=linter.verify(String(code),{languageOptions:{ecmaVersion:'latest',sourceType},linterOptions:{noInlineConfig:true},rules:{'no-constant-condition':['error',{checkLoops:'all'}],'no-unmodified-loop-condition':'error'}},{filename:'alumno.js',allowInlineConfig:false,disableFixes:true});
 if(messages.some(m=>m.fatal))return messages;
 const ast=linter.getSourceCode()?.ast;if(!ast)return messages;
 const loops=[];
 function collect(node,parent){if(!node.parent&&parent)Object.defineProperty(node,'parent',{value:parent,configurable:true});if(types.has(node.type))loops.push(node);for(const child of children(node))collect(child,node);}
 collect(ast,null);
 const starts=[0];for(let i=0;i<code.length;i++)if(code[i]==='\n')starts.push(i+1);
 const result=messages.filter(message=>{
  if(!['no-constant-condition','no-unmodified-loop-condition'].includes(message.ruleId))return true;
  const position=(starts[message.line-1]||0)+message.column-1;
  const loop=loops.find(node=>node.test&&position>=node.test.range[0]&&position<node.test.range[1]);
  return !!loop&&truth(loop.test)!==false&&!canExit(loop);
 });
 for(const loop of loops)if(loop.type==='ForStatement'&&!loop.test&&!canExit(loop))result.push({ruleId:'base4/no-unbounded-loop',severity:2,line:loop.loc.start.line,column:loop.loc.start.column+1,message:'Loop without a stopping condition or an identifiable exit.'});
 return result.sort((a,b)=>a.line-b.line||a.column-b.column);
}
const api={verify,version:linter.version};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LabESLint=api;
})(typeof self==='object'?self:globalThis);
