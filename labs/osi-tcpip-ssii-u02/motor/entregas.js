(() => {
  'use strict';
  const configured=delivery=>delivery?.type==='download' || delivery?.type==='apps-script' && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(delivery.endpoint || '');
  const googleOrigin=origin=>/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
  function send(delivery,envelope) {
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
          // HtmlService se ejecuta dentro de un iframe adicional de Google.
          peer=event.source;peerOrigin=event.origin;sent=true;
          peer.postMessage({type:'LAB_SUBMIT',channel,envelope},peerOrigin);
        } else if(m.type==='LAB_RESULT'&&sent&&event.source===peer&&event.origin===peerOrigin){
          const result=m.result;
          if(!result?.ok){fail(result?.code||'STORAGE');return;}
          if(result.submissionId!==envelope.submissionId||typeof result.receivedAt!=='string'||!Number.isFinite(Date.parse(result.receivedAt))){fail('INVALID_RECEIPT');return;}
          cleanup();resolve({submissionId:result.submissionId,receivedAt:result.receivedAt});
        }
      }
      window.addEventListener('message',receive);
      frame.onerror=()=>fail('NETWORK');frame.src=url.href;document.body.append(frame);
    });
  }
  window.LabDelivery=Object.freeze({configured,send});
})();
