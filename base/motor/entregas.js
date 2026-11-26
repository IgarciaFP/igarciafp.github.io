(() => {
  'use strict';
  const configured=delivery=>delivery?.type==='apps-script' && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(delivery.endpoint || '');
  const googleOrigin=origin=>/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
  function send(delivery,envelope,statusOnly=false) {
    if(!configured(delivery))return Promise.reject(Error('NOT_CONFIGURED'));
    return new Promise((resolve,reject)=>{
      const channel=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
      const url=new URL(delivery.endpoint);url.searchParams.set('practice',envelope.practiceId);url.searchParams.set('channel',channel);
      const frame=document.createElement('iframe');frame.hidden=true;frame.title='Recepción de entrega';
      let peer=null,peerOrigin=null,sent=false;
      const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();};
      const fail=code=>{cleanup();reject(Error(code));};
      const timer=setTimeout(()=>fail('TIMEOUT'),90000);
      function receive(event) {
        const m=event.data;
        if(!googleOrigin(event.origin)||m?.channel!==channel||!event.source)return;
        if(m.type==='LAB_READY'&&!sent){
          if(delivery.requireAttemptLimit&&(!Array.isArray(m.capabilities)||!m.capabilities.includes('attempt-limit'))){fail('RECEIVER_VERSION');return;}
          if(delivery.requireEncryptedStorage&&(!Array.isArray(m.capabilities)||!m.capabilities.includes('encrypted-storage'))){fail('RECEIVER_VERSION');return;}
          if(statusOnly==='start'&&(!Array.isArray(m.capabilities)||!m.capabilities.includes('start'))){fail('RECEIVER_VERSION');return;}
          // HtmlService se ejecuta dentro de un iframe adicional de Google.
          peer=event.source;peerOrigin=event.origin;sent=true;
          peer.postMessage({type:statusOnly==='start'?'LAB_START':statusOnly?'LAB_STATUS':'LAB_SUBMIT',channel,envelope},peerOrigin);
        } else if(m.type==='LAB_RESULT'&&sent&&event.source===peer&&event.origin===peerOrigin){
          const result=m.result;
          if(!result?.ok){fail(result?.code||'STORAGE');return;}
          if(delivery.requireAttemptLimit&&statusOnly&&result.limitEnforced!==true){fail('RECEIVER_VERSION');return;}
          if(delivery.requireEncryptedStorage&&statusOnly&&result.encryptedStorage!==true){fail('RECEIVER_VERSION');return;}
          if(statusOnly==='start'){
            const data=JSON.parse(envelope.payload);
            if(result.attemptId!==data.attemptId||!Number.isSafeInteger(result.number)||result.number<1||!Number.isSafeInteger(result.limit)||result.limit<0){fail('INVALID_RECEIPT');return;}
            cleanup();resolve(result);return;
          }
          if(statusOnly){
            if(result.practiceId!==envelope.practiceId||result.email!==envelope.email.toLowerCase()||
              !Number.isSafeInteger(result.used)||result.used<0||!Number.isSafeInteger(result.limit)||result.limit<0){fail('INVALID_RECEIPT');return;}
            cleanup();resolve(result);return;
          }
          if(result.submissionId!==envelope.submissionId||typeof result.receivedAt!=='string'||!Number.isFinite(Date.parse(result.receivedAt))){fail('INVALID_RECEIPT');return;}
          cleanup();resolve({submissionId:result.submissionId,receivedAt:result.receivedAt});
        }
      }
      window.addEventListener('message',receive);
      frame.onerror=()=>fail('NETWORK');frame.src=url.href;document.body.append(frame);
    });
  }
  window.LabDelivery=Object.freeze({configured,send,start:(delivery,envelope)=>send(delivery,envelope,'start'),status:(delivery,envelope)=>send(delivery,envelope,true)});
})();
