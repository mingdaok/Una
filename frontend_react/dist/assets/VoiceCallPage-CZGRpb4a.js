import{c as uc,b as Sf,g as Tf,r as mr,j as pt}from"./index-D6B2pA21.js";import{M as Ef}from"./mic-BI7_5-4S.js";var vt=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const If=uc("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kf=uc("PhoneOff",[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91",key:"z86iuo"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22",key:"11kh81"}]]),Cf=.12,zf=.03,Af=.01,Of=4095,ds=()=>{};function Rf(v){if(!Number.isSafeInteger(v)||v<=0)throw new TypeError("turnId 必须为正安全整数")}function Mf(v){if(!v||typeof v!="object")throw new TypeError("PCM format 必须为对象");if(!Number.isSafeInteger(v.sample_rate)||v.sample_rate<8e3||v.sample_rate>48e3)throw new RangeError("sample_rate 必须在 8000..48000");if(v.channels!==1)throw new RangeError("channels 必须为 1");if(v.sample_width!==2)throw new RangeError("sample_width 必须为 2");return Object.freeze({sample_rate:v.sample_rate,channels:1,sample_width:2})}function Bf(v){let O;if(v instanceof ArrayBuffer)O=new Uint8Array(v);else if(ArrayBuffer.isView(v))O=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);else throw new TypeError("PCM 必须为 ArrayBuffer 或 TypedArray");if(!O.byteLength||O.byteLength%2)throw new RangeError("PCM16 必须为非空偶数字节");return O.slice().buffer}function Df(v={}){const O=v.createAudioContext||(()=>new AudioContext),W=v.now||(()=>performance.now()),H=v.reportMetric||ds;let X=null,D=null,se=!1,re=Promise.resolve();function E(){return X||(X=O()),X}function ce(q){for(const ae of q.sources)try{ae.stop()}catch{}q.sources.clear()}function $e(q){D&&(D.active=!1,D.status=q,D.pending.clear(),ce(D))}function Ee(q,ae,Q){const Ne=ae.byteLength/2,Ce=X.createBuffer(1,Ne,q.format.sample_rate),qe=Ce.getChannelData(0),yt=new DataView(ae);for(let Xe=0;Xe<Ne;Xe+=1)qe[Xe]=yt.getInt16(Xe*2,!0)/32768;return Ce.__voiceSequence=Q,Ce}function fe(q){let ae=q.expectedSequence,Q=0;for(;q.pending.has(ae);)Q+=q.pending.get(ae).byteLength/2,ae+=1;return Q}function ve(q){if(!(!q.active||D!==q)){if(!q.playbackBegun){const ae=fe(q),Q=Math.ceil(q.format.sample_rate*Cf);if(!q.sealed&&ae<Q||!ae)return;q.playbackBegun=!0,q.nextStartAt=X.currentTime+zf}for(;q.active&&q.pending.has(q.expectedSequence);){const ae=q.expectedSequence,Q=q.pending.get(ae);q.pending.delete(ae),X.currentTime>q.nextStartAt&&H("pcm_playback_underflow",{turn_id:q.turnId,sequence:ae,gap_ms:Math.round((X.currentTime-q.nextStartAt)*1e3),at_ms:W()});const Ne=Ee(q,Q,ae),Ce=X.createBufferSource();Ce.buffer=Ne,Ce.__voiceSequence=ae,Ce.connect(X.destination);const qe=Math.max(q.nextStartAt,X.currentTime+Af);Ce.onended=()=>{q.sources.delete(Ce),q.active&&q.sealed&&!q.pending.size&&!q.sources.size&&(q.status="completed")},q.sources.add(Ce),Ce.start(qe),q.nextStartAt=qe+Ne.duration,q.expectedSequence+=1,q.status=q.sealed?"sealed":"playing"}q.sealed&&!q.pending.size&&!q.sources.size&&(q.status="completed")}}function le(q){return re=re.catch(ds).then(async()=>{!q.active||D!==q||se||(X.state==="suspended"&&await X.resume(),ve(q))}),re}function xe(q){le(q).catch(ae=>{H("pcm_playback_error",{turn_id:q.turnId,message:ae instanceof Error?ae.message:String(ae),at_ms:W()})})}function Le(q,ae){if(se)throw new Error("PCM 播放器已销毁");Rf(q);const Q=Mf(ae);return E(),$e("superseded"),D={turnId:q,format:Q,active:!0,status:"buffering",sealed:!1,playbackBegun:!1,expectedSequence:0,seenSequences:new Set,pending:new Map,sources:new Set,nextStartAt:0},{accepted:!0}}function Ge(q,ae,Q){if(!D||!D.active||D.turnId!==q)return{accepted:!1,reason:"stale"};if(D.sealed)return{accepted:!1,reason:"sealed"};if(!Number.isSafeInteger(ae)||ae<0||ae>Of)return{accepted:!1,reason:"invalid_sequence"};if(D.seenSequences.has(ae))return{accepted:!1,reason:"duplicate"};let Ne;try{Ne=Bf(Q)}catch(Ce){return{accepted:!1,reason:"invalid_pcm",error:Ce}}return D.seenSequences.add(ae),D.pending.set(ae,Ne),D.status="buffering",xe(D),{accepted:!0}}function Ie(q){if(!D||!D.active||D.turnId!==q)return{accepted:!1,reason:"stale"};D.sealed=!0,D.status="sealed";const Q=[...D.pending.keys()].sort((Ce,qe)=>Ce-qe).at(-1);let Ne=null;if(Q!==void 0){for(let Ce=D.expectedSequence;Ce<=Q;Ce+=1)if(!D.seenSequences.has(Ce)){Ne=Ce;break}}return Ne!==null&&(D.status="sequence_gap",H("pcm_sequence_gap",{turn_id:q,expected_sequence:Ne,at_ms:W()})),xe(D),Ne===null?{accepted:!0}:{accepted:!1,reason:"missing_sequence",expected_sequence:Ne}}function Y(q){return!D||D.turnId!==q||!D.active?{accepted:!1,reason:"stale"}:($e("interrupted"),{accepted:!0})}async function ue(){se||(se=!0,$e("destroyed"),await re.catch(ds),X&&X.state!=="closed"&&await X.close())}function ie(){if(!D)return Object.freeze({status:se?"destroyed":"idle"});const q=[...D.pending.values()].reduce((ae,Q)=>ae+Q.byteLength/2,0);return Object.freeze({turnId:D.turnId,status:D.status,active:D.active,sealed:D.sealed,expectedSequence:D.expectedSequence,pendingSequences:Object.freeze([...D.pending.keys()].sort((ae,Q)=>ae-Q)),bufferedMs:Math.round(q/D.format.sample_rate*1e3),nextStartAt:D.nextStartAt})}return{start:Le,enqueue:Ge,seal:Ie,interrupt:Y,destroy:ue,snapshot:ie,whenScheduled:()=>re}}const Xp=65536,lc=4095,Pf=9007199254740991,ja=8192,Yp=Object.freeze({call_start:[],user_speech_start:["session_id","turn_id"],input_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],user_speech_end:["session_id","turn_id"],interrupt:["session_id","turn_id"],call_end:["session_id"],pong:[]}),Jp=Object.freeze({call_ready:["session_id"],transcript_final:["session_id","turn_id","text"],assistant_text_delta:["session_id","turn_id","text"],assistant_text_end:["session_id","turn_id"],tts_start:["session_id","turn_id","sample_rate","channels","sample_width"],tts_end:["session_id","turn_id"],output_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],turn_cancelled:["session_id","turn_id","reason"],call_error:["session_id","turn_id","code","message"],call_ended:["session_id"]});function tt(v){return new Error(v)}function cs(v){return v!==null&&typeof v=="object"&&!Array.isArray(v)}function ui(v,O){if(typeof v!="string"||!v.trim())throw tt(`${O} 不能为空`);return v}function fs(v,O){if(!Number.isSafeInteger(v)||v<=0||v>Pf)throw tt(`${O} 必须为正整数`);return v}function hs(v,O){const W=new Set(O),H=Object.keys(v);if(H.some(X=>!W.has(X)))throw tt("控制消息含未知字段");if(H.length!==W.size)throw tt("控制消息缺少字段")}function dc(v){if(!cs(v))throw tt("二进制帧头必须是对象");hs(v,["session_id","direction","turn_id","sequence","byte_length"]);const O=ui(v.session_id,"session_id");if(v.direction!=="input"&&v.direction!=="output")throw tt("direction 必须为 input 或 output");const W=fs(v.turn_id,"turn_id");if(!Number.isSafeInteger(v.sequence)||v.sequence<0||v.sequence>lc)throw tt("sequence 超出范围");if(!Number.isSafeInteger(v.byte_length)||v.byte_length<=0||v.byte_length>Xp)throw tt(`byte_length 必须在 1..${Xp}`);if(v.byte_length%2)throw tt("PCM16 必须为偶数字节");return Object.freeze({session_id:O,direction:v.direction,turn_id:W,sequence:v.sequence,byte_length:v.byte_length})}function Uf(v){if(!cs(v))throw tt("控制消息必须是对象");if(typeof v.type!="string"||!Object.hasOwn(Yp,v.type))throw tt("未知事件类型");const O=Yp[v.type];hs(v,["type",...O]);const W={type:v.type};if(O.includes("session_id")&&(W.session_id=ui(v.session_id,"session_id")),O.includes("turn_id")&&(W.turn_id=fs(v.turn_id,"turn_id")),O.includes("direction")){if(v.direction!=="input")throw tt("direction 必须为 input");W.direction="input"}if(O.includes("sequence")){if(!Number.isSafeInteger(v.sequence)||v.sequence<0||v.sequence>lc)throw tt("sequence 超出范围");W.sequence=v.sequence}return O.includes("byte_length")&&(W.byte_length=dc({session_id:W.session_id,direction:W.direction,turn_id:W.turn_id,sequence:W.sequence,byte_length:v.byte_length}).byte_length),W}function ec(v,O={}){const W=JSON.stringify(Uf({type:v,...O}));if(new TextEncoder().encode(W).byteLength>ja)throw tt(`控制消息不能超过 ${ja} 字节`);return W}function Nf(v){if(typeof v!="string")throw tt("控制消息必须是字符串");if(new TextEncoder().encode(v).byteLength>ja)throw tt(`控制消息不能超过 ${ja} 字节`);let O;try{O=JSON.parse(v)}catch{throw tt("控制消息不是合法 JSON")}if(!cs(O))throw tt("控制消息必须是对象");if(typeof O.type!="string"||!Object.hasOwn(Jp,O.type))throw tt("未知事件类型");const W=Jp[O.type];hs(O,["type",...W]);const H={type:O.type};if(W.includes("session_id")&&(H.session_id=ui(O.session_id,"session_id")),W.includes("turn_id")&&(H.turn_id=fs(O.turn_id,"turn_id")),W.includes("text")&&(H.text=ui(O.text,"text")),W.includes("reason")&&(H.reason=ui(O.reason,"reason")),W.includes("code")&&(H.code=ui(O.code,"code")),W.includes("message")&&(H.message=ui(O.message,"message")),O.type==="tts_start"){if(!Number.isSafeInteger(O.sample_rate)||O.sample_rate<8e3||O.sample_rate>48e3)throw tt("sample_rate 必须在 8000..48000");if(O.channels!==1)throw tt("channels 必须为 1");if(O.sample_width!==2)throw tt("sample_width 必须为 2");H.sample_rate=O.sample_rate,H.channels=O.channels,H.sample_width=O.sample_width}if(O.type==="output_audio_chunk"){const X=dc({session_id:O.session_id,turn_id:O.turn_id,direction:O.direction,sequence:O.sequence,byte_length:O.byte_length});if(X.direction!=="output")throw tt("direction 必须为 output");H.session_id=X.session_id,H.turn_id=X.turn_id,H.direction=X.direction,H.sequence=X.sequence,H.byte_length=X.byte_length}return H}function Lf(v={}){const O=v.createTicket||(()=>Sf("语音通话")),W=v.WebSocketImpl||WebSocket,H=(v.websocketBase||Tf()).replace(/\/$/,""),X=v.onControl||(()=>{}),D=v.onPcm||(()=>{}),se=v.onClose||(()=>{}),re=v.onError||(()=>{});let E=null,ce=null,$e=null,Ee=!1;function fe(Ie){const Y=Ie instanceof Error?Ie:new Error(String(Ie));re(Y),$e=null,E&&E.readyState<2&&E.close(1003,"protocol error")}function ve(Ie){if(Ee)return;const Y=Ie.data;if(typeof Y=="string"){if($e){fe("音频元数据后必须紧跟 PCM 二进制数据");return}try{const q=Nf(Y);q.type==="output_audio_chunk"?$e=q:X(q)}catch(q){fe(q)}return}let ue;if(Y instanceof ArrayBuffer)ue=Y;else if(ArrayBuffer.isView(Y))ue=Y.buffer.slice(Y.byteOffset,Y.byteOffset+Y.byteLength);else{fe("语音二进制消息必须为 ArrayBuffer");return}if(!$e){fe("PCM 二进制数据缺少元数据");return}const ie=$e;if($e=null,ue.byteLength!==ie.byte_length){fe("PCM 长度与元数据不一致");return}D(ie,ue)}async function le(){if(Ee)throw new Error("语音连接已关闭");return ce||(ce=(async()=>{const Ie=await O(),Y=`${H}/ws/voice-call?ticket=${encodeURIComponent(Ie)}`;E=new W(Y),E.binaryType="arraybuffer",await new Promise((ue,ie)=>{let q=!1;E.onopen=()=>{q=!0,ue()},E.onerror=()=>{const ae=new Error("语音 WebSocket 连接失败");re(ae),q||(ie(ae),E.readyState<2&&E.close(1011,"connect failed"))},E.onclose=ae=>{$e=null;const Q=Ee;Ee=!0,se(ae),!q&&!Q&&ie(new Error("语音 WebSocket 在连接前关闭"))},E.onmessage=ve})})(),ce)}function xe(Ie,Y={}){return!E||E.readyState!==1||Ee?{accepted:!1,reason:"closed"}:(E.send(ec(Ie,Y)),{accepted:!0})}function Le(Ie,Y,ue,ie){if(!E||E.readyState!==1||Ee)return{accepted:!1,reason:"closed"};const q=ie instanceof ArrayBuffer?ie:ArrayBuffer.isView(ie)?ie.buffer.slice(ie.byteOffset,ie.byteOffset+ie.byteLength):null;if(!q||!q.byteLength)return{accepted:!1,reason:"invalid_pcm"};let ae;try{ae=ec("input_audio_chunk",{session_id:Ie,turn_id:Y,direction:"input",sequence:ue,byte_length:q.byteLength})}catch(Q){return{accepted:!1,reason:"invalid_pcm",error:Q}}return E.send(ae),E.send(q),{accepted:!0}}function Ge(Ie=1e3){Ee||(Ee=!0,$e=null,E&&E.readyState<2&&E.close(Ie))}return{connect:le,sendCallStart:()=>xe("call_start"),sendSpeechStart:(Ie,Y)=>xe("user_speech_start",{session_id:Ie,turn_id:Y}),sendAudio:Le,sendSpeechEnd:(Ie,Y)=>xe("user_speech_end",{session_id:Ie,turn_id:Y}),sendInterrupt:(Ie,Y)=>xe("interrupt",{session_id:Ie,turn_id:Y}),sendCallEnd:Ie=>xe("call_end",{session_id:Ie}),disconnect:Ge,snapshot:()=>Object.freeze({connected:!!(E&&E.readyState===1&&!Ee),closed:Ee,awaitingPcm:!!$e})}}var pc={},Sa={};Object.defineProperty(Sa,"__esModule",{value:!0});Sa.baseAssetPath=void 0;const qf=typeof window<"u"&&typeof window.document<"u",tc=qf?window.document.currentScript:null;let cc="/";tc&&(cc=tc.src.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^/]+$/,"/"));Sa.baseAssetPath=cc;var Ci={};Object.defineProperty(Ci,"__esModule",{value:!0});Ci.defaultModelFetcher=void 0;const Vf=v=>fetch(v).then(O=>O.arrayBuffer());Ci.defaultModelFetcher=Vf;var sr={},Er={};Object.defineProperty(Er,"__esModule",{value:!0});Er.log=void 0;const ps=v=>O=>{console.log(`VAD | ${v} >`,O)};Er.log={error:ps("error"),debug:ps("debug"),warn:ps("warn")};var li={};Object.defineProperty(li,"__esModule",{value:!0});li.Message=void 0;var rc;(function(v){v.AudioFrame="AUDIO_FRAME",v.SpeechStart="SPEECH_START",v.VADMisfire="VAD_MISFIRE",v.SpeechEnd="SPEECH_END",v.SpeechStop="SPEECH_STOP",v.SpeechRealStart="SPEECH_REAL_START",v.FrameProcessed="FRAME_PROCESSED"})(rc||(li.Message=rc={}));Object.defineProperty(sr,"__esModule",{value:!0});sr.FrameProcessor=sr.validateOptions=sr.defaultFrameProcessorOptions=void 0;const $a=Er,si=li;sr.defaultFrameProcessorOptions={positiveSpeechThreshold:.3,negativeSpeechThreshold:.25,preSpeechPadMs:800,redemptionMs:1400,minSpeechMs:400,submitUserSpeechOnPause:!1};function Ff(v){(v.positiveSpeechThreshold<0||v.positiveSpeechThreshold>1)&&$a.log.error("positiveSpeechThreshold should be a number between 0 and 1"),(v.negativeSpeechThreshold<0||v.negativeSpeechThreshold>v.positiveSpeechThreshold)&&$a.log.error("negativeSpeechThreshold should be between 0 and positiveSpeechThreshold"),v.preSpeechPadMs<0&&$a.log.error("preSpeechPadMs should be positive"),v.redemptionMs<0&&$a.log.error("redemptionMs should be positive"),v.minSpeechMs<0&&$a.log.error("minSpeechMs should be positive")}sr.validateOptions=Ff;const ic=v=>{const O=v.reduce((H,X)=>(H.push(H.at(-1)+X.length),H),[0]),W=new Float32Array(O.at(-1));return v.forEach((H,X)=>{const D=O[X];W.set(H,D)}),W};function ac(v,O){const W=Math.floor(v.redemptionMs/O),H=Math.floor(v.preSpeechPadMs/O),X=Math.floor(v.minSpeechMs/O);return{redemptionFrames:W,preSpeechPadFrames:H,minSpeechFrames:X}}class Wf{constructor(O,W,H,X){this.modelProcessFunc=O,this.modelResetFunc=W,this.options=H,this.msPerFrame=X,this.speaking=!1,this.redemptionCounter=0,this.speechFrameCount=0,this.active=!1,this.speechRealStartFired=!1,this.setOptions=E=>{this.options={...this.options,...E};const{redemptionFrames:ce,preSpeechPadFrames:$e,minSpeechFrames:Ee}=ac(this.options,this.msPerFrame);this.redemptionFrames=ce,this.preSpeechPadFrames=$e,this.minSpeechFrames=Ee},this.reset=()=>{this.speaking=!1,this.speechRealStartFired=!1,this.audioBuffer=[],this.modelResetFunc(),this.redemptionCounter=0,this.speechFrameCount=0},this.pause=E=>{this.active=!1,this.options.submitUserSpeechOnPause?this.endSegment(E):this.reset()},this.resume=()=>{this.active=!0},this.endSegment=E=>{const ce=this.audioBuffer;this.audioBuffer=[];const $e=this.speaking;if(this.reset(),$e)if(ce.reduce((fe,ve)=>ve.isSpeech?fe+1:fe,0)>=this.minSpeechFrames){const fe=ic(ce.map(ve=>ve.frame));E({msg:si.Message.SpeechEnd,audio:fe})}else E({msg:si.Message.VADMisfire});return{}},this.process=async(E,ce)=>{if(!this.active)return;const $e=await this.modelProcessFunc(E),Ee=$e.isSpeech>=this.options.positiveSpeechThreshold;if(ce({probs:$e,msg:si.Message.FrameProcessed,frame:E}),this.audioBuffer.push({frame:E,isSpeech:Ee}),Ee&&(this.speechFrameCount++,this.redemptionCounter=0),Ee&&!this.speaking&&(this.speaking=!0,ce({msg:si.Message.SpeechStart})),this.speaking&&this.speechFrameCount===this.minSpeechFrames&&!this.speechRealStartFired&&(this.speechRealStartFired=!0,ce({msg:si.Message.SpeechRealStart})),$e.isSpeech<this.options.negativeSpeechThreshold&&this.speaking&&++this.redemptionCounter>=this.redemptionFrames){this.redemptionCounter=0,this.speechFrameCount=0,this.speaking=!1,this.speechRealStartFired=!1;const fe=this.audioBuffer;if(this.audioBuffer=[],fe.reduce((le,xe)=>xe.isSpeech?le+1:le,0)>=this.minSpeechFrames){const le=ic(fe.map(xe=>xe.frame));ce({msg:si.Message.SpeechEnd,audio:le})}else ce({msg:si.Message.VADMisfire})}if(!this.speaking){for(;this.audioBuffer.length>this.preSpeechPadFrames;)this.audioBuffer.shift();this.speechFrameCount=0}},this.audioBuffer=[];const{redemptionFrames:D,preSpeechPadFrames:se,minSpeechFrames:re}=ac(this.options,this.msPerFrame);this.redemptionFrames=D,this.preSpeechPadFrames=se,this.minSpeechFrames=re,this.reset()}}sr.FrameProcessor=Wf;var fc={};function Lt(v){throw new Error('Could not dynamically require "'+v+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var hc={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */(function(v,O){var W=(()=>{var H=Object.defineProperty,X=Object.getOwnPropertyDescriptor,D=Object.getOwnPropertyNames,se=Object.prototype.hasOwnProperty,re=(e=>typeof Lt<"u"?Lt:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof Lt<"u"?Lt:t)[r]}):e)(function(e){if(typeof Lt<"u")return Lt.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),E=(e,t)=>()=>(e&&(t=e(e=0)),t),ce=(e,t)=>{for(var r in t)H(e,r,{get:t[r],enumerable:!0})},$e=(e,t,r,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of D(t))!se.call(e,a)&&a!==r&&H(e,a,{get:()=>t[a],enumerable:!(i=X(t,a))||i.enumerable});return e},Ee=e=>$e(H({},"__esModule",{value:!0}),e),fe,ve,le,xe,Le,Ge=E(()=>{fe=new Map,ve=[],le=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let i=fe.get(e);if(i===void 0)fe.set(e,{backend:t,priority:r});else{if(i.priority>r)return;if(i.priority===r&&i.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=ve.indexOf(e);a!==-1&&ve.splice(a,1);for(let n=0;n<ve.length;n++)if(fe.get(ve[n]).priority<=r){ve.splice(n,0,e);return}ve.push(e)}return}throw new TypeError("not a valid backend")},xe=async e=>{let t=fe.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(i){return r||(t.error=`${i}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},Le=async e=>{let t=e.executionProviders||[],r=t.map(u=>typeof u=="string"?u:u.name),i=r.length===0?ve:r,a,n=[],s=new Set;for(let u of i){let l=await xe(u);typeof l=="string"?n.push({name:u,err:l}):(a||(a=l),a===l&&s.add(u))}if(!a)throw new Error(`no available backend found. ERR: ${n.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:l}of n)r.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${l}`);let o=t.filter(u=>s.has(typeof u=="string"?u:u.name));return[a,new Proxy(e,{get:(u,l)=>l==="executionProviders"?o:Reflect.get(u,l)})]}}),Ie=E(()=>{Ge()}),Y,ue=E(()=>{Y="1.22.0"}),ie,q,ae=E(()=>{ue(),ie="warning",q={wasm:{},webgl:{},webgpu:{},versions:{common:Y},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);ie=e}},get logLevel(){return ie}},Object.defineProperty(q,"logLevel",{enumerable:!0})}),Q,Ne=E(()=>{ae(),Q=q}),Ce,qe,yt=E(()=>{Ce=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let i=r.getContext("2d");if(i!=null){let a,n;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[3]):(a=e.dims[3],n=e.dims[2]);let s=(t==null?void 0:t.format)!==void 0?t.format:"RGB",o=t==null?void 0:t.norm,u,l;o===void 0||o.mean===void 0?u=[255,255,255,255]:typeof o.mean=="number"?u=[o.mean,o.mean,o.mean,o.mean]:(u=[o.mean[0],o.mean[1],o.mean[2],0],o.mean[3]!==void 0&&(u[3]=o.mean[3])),o===void 0||o.bias===void 0?l=[0,0,0,0]:typeof o.bias=="number"?l=[o.bias,o.bias,o.bias,o.bias]:(l=[o.bias[0],o.bias[1],o.bias[2],0],o.bias[3]!==void 0&&(l[3]=o.bias[3]));let d=n*a,p=0,f=d,h=d*2,m=-1;s==="RGBA"?(p=0,f=d,h=d*2,m=d*3):s==="RGB"?(p=0,f=d,h=d*2):s==="RBG"&&(p=0,h=d,f=d*2);for(let y=0;y<n;y++)for(let $=0;$<a;$++){let w=(e.data[p++]-l[0])*u[0],_=(e.data[f++]-l[1])*u[1],T=(e.data[h++]-l[2])*u[2],x=m===-1?255:(e.data[m++]-l[3])*u[3];i.fillStyle="rgba("+w+","+_+","+T+","+x+")",i.fillRect($,y,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},qe=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),i;if(r!=null){let a,n,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[1],s=e.dims[3]):(a=e.dims[3],n=e.dims[2],s=e.dims[1]);let o=t!==void 0&&t.format!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,l,d;u===void 0||u.mean===void 0?l=[255,255,255,255]:typeof u.mean=="number"?l=[u.mean,u.mean,u.mean,u.mean]:(l=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(l[3]=u.mean[3])),u===void 0||u.bias===void 0?d=[0,0,0,0]:typeof u.bias=="number"?d=[u.bias,u.bias,u.bias,u.bias]:(d=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(d[3]=u.bias[3]));let p=n*a;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let f=4,h=0,m=1,y=2,$=3,w=0,_=p,T=p*2,x=-1;o==="RGBA"?(w=0,_=p,T=p*2,x=p*3):o==="RGB"?(w=0,_=p,T=p*2):o==="RBG"&&(w=0,T=p,_=p*2),i=r.createImageData(a,n);for(let z=0;z<n*a;h+=f,m+=f,y+=f,$+=f,z++)i.data[h]=(e.data[w++]-d[0])*l[0],i.data[m]=(e.data[_++]-d[1])*l[1],i.data[y]=(e.data[T++]-d[2])*l[2],i.data[$]=x===-1?255:(e.data[x++]-d[3])*l[3]}else throw new Error("Can not access image data");return i}}),Xe,ut,st,It,Ve,wt,or=E(()=>{St(),Xe=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:i}=t,a=t.norm??{mean:255,bias:0},n,s;typeof a.mean=="number"?n=[a.mean,a.mean,a.mean,a.mean]:n=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?s=[a.bias,a.bias,a.bias,a.bias]:s=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let o=t.format!==void 0?t.format:"RGBA",u=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*i,d=u==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),p=4,f=0,h=1,m=2,y=3,$=0,w=l,_=l*2,T=-1;o==="RGB"&&(p=3,f=0,h=1,m=2,y=-1),u==="RGBA"?T=l*3:u==="RBG"?($=0,_=l,w=l*2):u==="BGR"&&(_=0,w=l,$=l*2);for(let x=0;x<l;x++,f+=p,m+=p,h+=p,y+=p)d[$++]=(e[f]+s[0])/n[0],d[w++]=(e[h]+s[1])/n[1],d[_++]=(e[m]+s[2])/n[2],T!==-1&&y!==-1&&(d[T++]=(e[y]+s[3])/n[3]);return u==="RGBA"?new Be("float32",d,[1,4,r,i]):new Be("float32",d,[1,3,r,i])},ut=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,i=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,n=typeof e=="string",s,o=t??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=d=>typeof HTMLCanvasElement<"u"&&d instanceof HTMLCanvasElement||d instanceof OffscreenCanvas?d.getContext("2d"):null;if(r){let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(f=t.resizedHeight,h=t.resizedWidth),t!==void 0){if(o=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");o.tensorFormat="RGBA",o.height=f,o.width=h}else o.tensorFormat="RGBA",o.height=f,o.width=h;p.drawImage(e,0,0),s=p.getImageData(0,0,h,f).data}else throw new Error("Can not access image data")}else if(i){let d,p;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(d=t.resizedHeight,p=t.resizedWidth):(d=e.height,p=e.width),t!==void 0&&(o=t),o.format="RGBA",o.height=d,o.width=p,t!==void 0){let f=u();f.width=p,f.height=d;let h=l(f);if(h!=null)h.putImageData(e,0,0),s=h.getImageData(0,0,p,d).data;else throw new Error("Can not access image data")}else s=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;return p.drawImage(e,0,0,h,f),s=p.getImageData(0,0,h,f).data,o.height=f,o.width=h,Xe(s,o)}else throw new Error("Can not access image data")}else{if(n)return new Promise((d,p)=>{let f=u(),h=l(f);if(!e||!h)return p();let m=new Image;m.crossOrigin="Anonymous",m.src=e,m.onload=()=>{f.width=m.width,f.height=m.height,h.drawImage(m,0,0,f.width,f.height);let y=h.getImageData(0,0,f.width,f.height);o.height=f.height,o.width=f.width,d(Xe(y.data,o))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return Xe(s,o);throw new Error("Input data provided is not supported - aborted tensor creation")},st=(e,t)=>{let{width:r,height:i,download:a,dispose:n}=t,s=[1,i,r,4];return new Be({location:"texture",type:"float32",texture:e,dims:s,download:a,dispose:n})},It=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new Be({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:i,download:a,dispose:n})},Ve=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new Be({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:i,download:a,dispose:n})},wt=(e,t,r)=>new Be({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),rt,xt,ee,Ye,Bt=E(()=>{rt=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),xt=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),ee=!1,Ye=()=>{if(!ee){ee=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,i=typeof r<"u"&&r.from;e&&(rt.set("int64",BigInt64Array),xt.set(BigInt64Array,"int64")),t&&(rt.set("uint64",BigUint64Array),xt.set(BigUint64Array,"uint64")),i?(rt.set("float16",r),xt.set(r,"float16")):rt.set("float16",Uint16Array)}}}),kt,ur,je=E(()=>{St(),kt=e=>{let t=1;for(let r=0;r<e.length;r++){let i=e[r];if(typeof i!="number"||!Number.isSafeInteger(i))throw new TypeError(`dims[${r}] must be an integer, got: ${i}`);if(i<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${i}`);t*=i}return t},ur=(e,t)=>{switch(e.location){case"cpu":return new Be(e.type,e.data,t);case"cpu-pinned":return new Be({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Be({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Be({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Be({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Be,St=E(()=>{yt(),or(),Bt(),je(),Be=class{constructor(e,t,r){Ye();let i,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,i=e.type,a=e.dims,e.location){case"cpu-pinned":{let s=rt.get(i);if(!s)throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);if(!(e.data instanceof s))throw new TypeError(`buffer should be of type ${s.name}`);this.cpuData=e.data;break}case"texture":{if(i!=="float32")throw new TypeError(`unsupported type "${i}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint64"&&i!=="int8"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let s,o;if(typeof e=="string")if(i=e,o=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");s=t}else{let u=rt.get(e);if(u===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&u===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${u.name} as data.`);e==="uint64"||e==="int64"?s=u.from(t,BigInt):s=u.from(t)}else if(t instanceof u)s=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")s=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&u!==Uint16Array)s=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${i} tensor's data must be type of ${u}`)}else if(o=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let u=typeof e[0];if(u==="string")i="string",s=e;else if(u==="boolean")i="bool",s=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${u}.`)}else if(e instanceof Uint8ClampedArray)i="uint8",s=Uint8Array.from(e);else{let u=xt.get(e.constructor);if(u===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);i=u,s=e}if(o===void 0)o=[s.length];else if(!Array.isArray(o))throw new TypeError("A tensor's dims must be a number array");a=o,this.cpuData=s,this.dataLocation="cpu"}let n=kt(a);if(this.cpuData&&n!==this.cpuData.length&&!((i==="uint4"||i==="int4")&&Math.ceil(n/2)===this.cpuData.length))throw new Error(`Tensor's size(${n}) does not match data length(${this.cpuData.length}).`);this.type=i,this.dims=a,this.size=n}static async fromImage(e,t){return ut(e,t)}static fromTexture(e,t){return st(e,t)}static fromGpuBuffer(e,t){return It(e,t)}static fromMLTensor(e,t){return Ve(e,t)}static fromPinnedBuffer(e,t,r){return wt(e,t,r)}toDataURL(e){return Ce(this,e)}toImageData(e){return qe(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return ur(this,e)}}}),We,zi=E(()=>{St(),We=Be}),Jt,Ir,lt,ot,Ai=E(()=>{ae(),Jt=(e,t)=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||console.timeStamp(`${e}::ORT::${t}`)},Ir=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],i=!1;for(let n=0;n<r.length;n++){if(i&&!r[n].includes("TRACE_FUNC")){let s=`FUNC_${e}::${r[n].trim().split(" ")[1]}`;t&&(s+=`::${t}`),Jt("CPU",s);return}r[n].includes("TRACE_FUNC")&&(i=!0)}},lt=e=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||Ir("BEGIN",e)},ot=e=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||Ir("END",e)}}),Oi,Za=E(()=>{Ge(),zi(),Ai(),Oi=class mc{constructor(t){this.handler=t}async run(t,r,i){lt();let a={},n={};if(typeof t!="object"||t===null||t instanceof We||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof We)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,d=Object.getOwnPropertyNames(r);for(let p of this.outputNames)if(d.indexOf(p)!==-1){let f=r[p];(f===null||f instanceof We)&&(l=!0,s=!1,a[p]=f)}if(l){if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else n=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(let l of this.outputNames)a[l]=null;let o=await this.handler.run(t,a,n),u={};for(let l in o)if(Object.hasOwnProperty.call(o,l)){let d=o[l];d instanceof We?u[l]=d:u[l]=new We(d.type,d.data,d.dims)}return ot(),u}async release(){return this.handler.dispose()}static async create(t,r,i,a){lt();let n,s={};if(typeof t=="string"){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let d=t,p=0,f=t.byteLength;if(typeof r=="object"&&r!==null)s=r;else if(typeof r=="number"){if(p=r,!Number.isSafeInteger(p))throw new RangeError("'byteOffset' must be an integer.");if(p<0||p>=d.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${d.byteLength}).`);if(f=t.byteLength-p,typeof i=="number"){if(f=i,!Number.isSafeInteger(f))throw new RangeError("'byteLength' must be an integer.");if(f<=0||p+f>d.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${d.byteLength-p}].`);if(typeof a=="object"&&a!==null)s=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof i<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");n=new Uint8Array(d,p,f)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[o,u]=await Le(s),l=await o.createInferenceSessionHandler(n,u);return ot(),new mc(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Qa=E(()=>{Za(),kr=Oi}),Xa=E(()=>{}),Ya=E(()=>{}),Ja=E(()=>{}),en=E(()=>{}),Ri={};ce(Ri,{InferenceSession:()=>kr,TRACE:()=>Jt,TRACE_FUNC_BEGIN:()=>lt,TRACE_FUNC_END:()=>ot,Tensor:()=>We,env:()=>Q,registerBackend:()=>le});var ct=E(()=>{Ie(),Ne(),Qa(),zi(),Xa(),Ya(),Ai(),Ja(),en()}),Cr=E(()=>{}),Mi={};ce(Mi,{default:()=>Bi});var zr,Ar,Bi,tn=E(()=>{var e;Bp(),Ct(),Dr(),zr="ort-wasm-proxy-worker",Ar=((e=globalThis.self)==null?void 0:e.name)===zr,Ar&&(self.onmessage=t=>{let{type:r,in:i}=t.data;try{switch(r){case"init-wasm":Nr(i.wasm).then(()=>{Xn(i).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:n}=i;Yn(n,a).then(()=>{postMessage({type:r})},s=>{postMessage({type:r,err:s})});break}case"copy-from":{let{buffer:a}=i,n=qa(a);postMessage({type:r,out:n});break}case"create":{let{model:a,options:n}=i;es(a,n).then(s=>{postMessage({type:r,out:s})},s=>{postMessage({type:r,err:s})});break}case"release":ts(i),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:n,inputs:s,outputIndices:o,options:u}=i;is(a,n,s,o,new Array(o.length).fill(null),u).then(l=>{l.some(d=>d[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:l},ns([...s,...l]))},l=>{postMessage({type:r,err:l})});break}case"end-profiling":as(i),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),Bi=Ar?null:t=>new Worker(t??Ke,{type:"classic",name:zr})}),Di,Pi,Ke,Or,lr,Ui,Ni,Rr,Li,Mr,qi,Br,Vi,Dr=E(()=>{Cr(),Di=typeof location>"u"?void 0:location.origin,Pi=()=>{var e,t;return typeof document<"u"?(e=document.currentScript)==null?void 0:e.src:typeof self<"u"?(t=self.location)==null?void 0:t.href:void 0},Ke=Pi(),Or=()=>{if(Ke&&!Ke.startsWith("blob:"))return Ke.substring(0,Ke.lastIndexOf("/")+1)},lr=(e,t)=>{try{let r=t??Ke;return(r?new URL(e,r):new URL(e)).origin===Di}catch{return!1}},Ui=(e,t)=>{let r=t??Ke;try{return(r?new URL(e,r):new URL(e)).href}catch{return}},Ni=(e,t)=>`${t??"./"}${e}`,Rr=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Li=async e=>(await import(e)).default,Mr=(tn(),Ee(Mi)).default,qi=async()=>{if(!Ke)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(lr(Ke))return[void 0,Mr()];let e=await Rr(Ke);return[e,Mr(e)]},Br=void 0,Vi=async(e,t,r)=>{if(!e&&!t&&Br&&Ke&&lr(Ke))return[void 0,Br];{let i="ort-wasm-simd-threaded.jsep.mjs",a=e??Ui(i,t),n=r&&a&&!lr(a,t),s=n?await Rr(a):a??Ni(i,t);return[n?s:void 0,await Li(s)]}}}),Pr,dr,qt,Ur,Fi,Wi,Gi,Nr,Se,Ct=E(()=>{Dr(),dr=!1,qt=!1,Ur=!1,Fi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Wi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Gi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async e=>{if(dr)return Promise.resolve();if(qt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");qt=!0;let t=e.initTimeout,r=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Gi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Wi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let i=Fi();r>1&&!i&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,n=typeof a=="string"?a:void 0,s=a==null?void 0:a.mjs,o=(s==null?void 0:s.href)??s,u=a==null?void 0:a.wasm,l=(u==null?void 0:u.href)??u,d=e.wasmBinary,[p,f]=await Vi(o,n,r>1),h=!1,m=[];if(t>0&&m.push(new Promise(y=>{setTimeout(()=>{h=!0,y()},t)})),m.push(new Promise((y,$)=>{let w={numThreads:r};if(d)w.wasmBinary=d;else if(l||n)w.locateFile=_=>l??n+_;else if(o&&o.indexOf("blob:")!==0)w.locateFile=_=>new URL(_,o).href;else if(p){let _=Or();_&&(w.locateFile=T=>_+T)}f(w).then(_=>{qt=!1,dr=!0,Pr=_,y(),p&&URL.revokeObjectURL(p)},_=>{qt=!1,Ur=!0,$(_)})})),await Promise.race(m),h)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},Se=()=>{if(dr&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),et,pr,_e,Lr=E(()=>{Ct(),et=(e,t)=>{let r=Se(),i=r.lengthBytesUTF8(e)+1,a=r._malloc(i);return r.stringToUTF8(e,a,i),t.push(a),a},pr=(e,t,r,i)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,n])=>{let s=t?t+a:a;if(typeof n=="object")pr(n,s+".",r,i);else if(typeof n=="string"||typeof n=="number")i(s,n.toString());else if(typeof n=="boolean")i(s,n?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof n}`)})},_e=e=>{let t=Se(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetLastError(a,a+i);let n=Number(t.getValue(a,i===4?"i32":"i64")),s=t.getValue(a+i,"*"),o=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${n}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(r)}}}),ji,rn=E(()=>{Ct(),Lr(),ji=e=>{let t=Se(),r=0,i=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let n=0;return(e==null?void 0:e.tag)!==void 0&&(n=et(e.tag,i)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,n),r===0&&_e("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&pr(e.extra,"",new WeakSet,(s,o)=>{let u=et(s,i),l=et(o,i);t._OrtAddRunConfigEntry(r,u,l)!==0&&_e(`Can't set a run config entry: ${s} - ${o}.`)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseRunOptions(r),i.forEach(s=>t._free(s)),n}}}),Hi,Ki,Zi,Vt,Qi,Xi,an=E(()=>{Ct(),Lr(),Hi=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Ki=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Zi=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},Vt=(e,t,r,i)=>{let a=et(t,i),n=et(r,i);Se()._OrtAddSessionConfigEntry(e,a,n)!==0&&_e(`Can't set a session config entry: ${t} - ${r}.`)},Qi=async(e,t,r)=>{for(let i of t){let a=typeof i=="string"?i:i.name,n=[];switch(a){case"webnn":if(a="WEBNN",typeof i!="string"){let d=i==null?void 0:i.deviceType;d&&Vt(e,"deviceType",d,r)}break;case"webgpu":if(a="JS",typeof i!="string"){let d=i;if(d!=null&&d.preferredLayout){if(d.preferredLayout!=="NCHW"&&d.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${d.preferredLayout}`);Vt(e,"preferredLayout",d.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${a}`)}let s=et(a,r),o=n.length,u=0,l=0;if(o>0){u=Se()._malloc(o*Se().PTR_SIZE),r.push(u),l=Se()._malloc(o*Se().PTR_SIZE),r.push(l);for(let d=0;d<o;d++)Se().setValue(u+d*Se().PTR_SIZE,n[d][0],"*"),Se().setValue(l+d*Se().PTR_SIZE,n[d][1],"*")}await Se()._OrtAppendExecutionProvider(e,s,u,l,o)!==0&&_e(`Can't append execution provider: ${a}.`)}},Xi=async e=>{let t=Se(),r=0,i=[],a=e||{};Zi(a);try{let n=Hi(a.graphOptimizationLevel??"all"),s=Ki(a.executionMode??"sequential"),o=typeof a.logId=="string"?et(a.logId,i):0,u=a.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log serverity level is not valid: ${u}`);let l=a.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let d=typeof a.optimizedModelFilePath=="string"?et(a.optimizedModelFilePath,i):0;if(r=t._OrtCreateSessionOptions(n,!!a.enableCpuMemArena,!!a.enableMemPattern,s,!!a.enableProfiling,0,o,u,l,d),r===0&&_e("Can't create session options."),a.executionProviders&&await Qi(r,a.executionProviders,i),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);Vt(r,"enableGraphCapture",a.enableGraphCapture.toString(),i)}if(a.freeDimensionOverrides)for(let[p,f]of Object.entries(a.freeDimensionOverrides)){if(typeof p!="string")throw new Error(`free dimension override name must be a string: ${p}`);if(typeof f!="number"||!Number.isInteger(f)||f<0)throw new Error(`free dimension override value must be a non-negative integer: ${f}`);let h=et(p,i);t._OrtAddFreeDimensionOverride(r,h,f)!==0&&_e(`Can't set a free dimension override: ${p} - ${f}.`)}return a.extra!==void 0&&pr(a.extra,"",new WeakSet,(p,f)=>{Vt(r,p,f,i)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseSessionOptions(r)!==0&&_e("Can't release session options."),i.forEach(s=>t._free(s)),n}}}),zt,At,Ot,qr,Vr,Fr,Wr,di,be=E(()=>{zt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},At=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},Ot=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],i=typeof t=="number"?t:t.reduce((a,n)=>a*n,1);return r>0?Math.ceil(i*r):void 0},qr=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Vr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Fr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Wr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",di=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Gr,Yi=E(()=>{Cr(),Gr=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),i=r?parseInt(r,10):0;if(i<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),n;try{n=new ArrayBuffer(i)}catch(o){if(o instanceof RangeError){let u=Math.ceil(i/65536);n=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw o}let s=0;for(;;){let{done:o,value:u}=await a.read();if(o)break;let l=u.byteLength;new Uint8Array(n,s,l).set(u),s+=l}return new Uint8Array(n,0,i)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Ji,pi,ci,er,fi,hi,Me,Dt=E(()=>{be(),Ji=["V","I","W","E","F"],pi=(e,t)=>{console.log(`[${Ji[e]},${new Date().toISOString()}]${t}`)},fi=(e,t)=>{ci=e,er=t},hi=(e,t)=>{let r=Vr(e),i=Vr(ci);r>=i&&pi(r,typeof t=="function"?t():t)},Me=(...e)=>{er&&hi(...e)}}),mi,tr,N,gr,gi,ea,Ft,he=E(()=>{mi=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},tr=class{static calcShape(e,t,r=!1){let i=e.length,a=t.length;if(i===0)return t;if(a===0)return e;let n=Math.max(e.length,t.length),s=new Array(n);if(r){if(i<2||a<2)return;let o=mi.calcMatMulShape([e[i-2],e[i-1]],[t[a-2],t[a-1]]);if(o===void 0)return;[s[n-2],s[n-1]]=o}for(let o=r?3:1;o<=n;o++){let u=i-o<0?1:e[i-o],l=a-o<0?1:t[a-o];if(u!==l&&u>1&&l>1)return;let d=Math.max(u,l);if(u&&l)s[n-o]=Math.max(u,l);else{if(d>1)return;s[n-o]=0}}return s}static isValidBroadcast(e,t){let r=e.length,i=t.length;if(r>i)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[i-a])return!1;return!0}},N=class Ga{static size(t){return Ga.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let i=t.length;if(i===0)return[];let a=new Array(i),n=i-1;for(;n>=0;){if(t[n]%r===0){a[n]=t[n]/r;break}if(r%t[n]!==0)throw new Error("cannot convert shape");a[n]=1,r/=t[n],n--}for(n--;n>=0;n--)a[n]=t[n];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Ga.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Ga.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,i){let a=1;for(let n=r;n<i;n++){if(t[n]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=Number(t[n])}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let i=new Array(r);i[r-1]=1,i[r-2]=t[r-1];for(let a=r-3;a>=0;--a)i[a]=i[a+1]*t[a+1];return i}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(i=>this.normalizeAxis(i,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(i=>t[i]):t.slice().reverse()}static padShape(t,r){let i=t.length;return t.map((a,n)=>a+r[n]+r[n+i])}static areEqual(t,r){return t.length!==r.length?!1:t.every((i,a)=>i===r[a])}},gr=class xa{static adjustPoolAttributes(t,r,i,a,n,s){if(!t&&i.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let o=0;o<r.length-2;o++)o>=i.length?i.push(r[o+2]):i[o]=r[o+2];for(let o=0;o<i.length;o++)if(o<a.length){if(a[o]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let o=0;o<i.length;o++)if(o<n.length){if(n[o]<0)throw new Error("dilations should be greater than or equal to 1")}else n.push(1);for(let o=0;o<i.length*2;o++)if(o<s.length){if(s[o]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let o=0;o<i.length;o++){if(i[o]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[o]>=i[o]||s[o+i.length]>=i[o])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,i,a,n,s,o){if(o){if(n.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<t.length-2;u++)xa.adjustPadAndReturnShape(t[u+(s?1:2)],r[u],i[u],a[u],n,u,u+t.length-2,o)}}static computePoolOutputShape(t,r,i,a,n,s,o){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let u=[r[0],r[1]];return xa.computeShapeHelper(t,r,u,i,a,n,s,o),u}static computeConvOutputShape(t,r,i,a,n,s,o){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[t[0],r[0]];return xa.computeShapeHelper(!1,t,u,i,a,n,s,o),u}static computeShapeHelper(t,r,i,a,n,s,o,u){if(t)for(let l=0;l<r.length-2;l++)i.push(1);else for(let l=0;l<r.length-2;l++)i.push(xa.adjustPadAndReturnShape(r[l+2],a[l],n[l],s[l],o,l,l+r.length-2,u))}static adjustPadAndReturnShape(t,r,i,a,n,s,o,u){let l=i*(a-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return n[s]=0,n[o]=0,Math.floor((t-l)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(i!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let d=((t+r-1)/r-1)*r+a-t;return n[s]=Math.floor(u==="SAME_LOWER"?(d+1)/2:d/2),n[o]=d-n[s],Math.floor((t+d-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+n[s]+n[o]-l)/r+1)}},gi=class{static getShapeOfGemmResult(e,t,r,i,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let n,s,o;t?(n=e[1],s=e[0]):(n=e[0],s=e[1]);let u=-1;if(i?(o=r[0],u=1):(o=r[1],u=0),r[u]!==s)throw new Error("dimension mismatch");if(n<=0||o<=0||s<=0)throw new Error("invalid shape specified");if(a&&!tr.isValidBroadcast(a,[n,o]))throw new Error("gemm: invalid bias shape for broadcast");return[n,o,s]}},ea=-34028234663852886e22,Ft=34028234663852886e22}),rr,yr=E(()=>{be(),rr=(e,t)=>new(qr(t))(e)}),cr,_r,jr,Hr,Wt,ir,yi,_i,wi,ta,ra,Ea=E(()=>{be(),Dt(),cr=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),_r=(e,t)=>{if(t==="int32")return e;let r=cr.get(t);if(!r)throw new Error(`WebNN backend does not support data type: ${t}`);let i=r/8;if(e.byteLength%i!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${i}.`);let a=e.byteLength/i,n=new(qr(t))(e.buffer,e.byteOffset,a);switch(t){case"int64":case"uint64":{let s=new Int32Array(a);for(let o=0;o<a;o++){let u=n[o];if(u>2147483647n||u<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");s[o]=Number(u)}return new Uint8Array(s.buffer)}case"int8":case"uint8":case"uint32":{if(t==="uint32"&&n.some(o=>o>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let s=Int32Array.from(n,Number);return new Uint8Array(s.buffer)}default:throw new Error(`Unsupported data conversion from ${t} to 'int32'`)}},jr=(e,t)=>{if(t==="int32")return e;if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let r=e.byteLength/4,i=new Int32Array(e.buffer,e.byteOffset,r);switch(t){case"int64":{let a=BigInt64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"uint64":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let a=BigUint64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"int8":{if(i.some(n=>n<-128||n>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let a=Int8Array.from(i,Number);return new Uint8Array(a.buffer)}case"uint8":{if(i.some(a=>a<0||a>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(i,Number)}case"uint32":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let a=Uint32Array.from(i,Number);return new Uint8Array(a.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${t}`)}},Hr=1,Wt=()=>Hr++,ir=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),yi=(e,t)=>{let r=cr.get(e);if(!r)throw new Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((i,a)=>i*a)*r/8):0},_i=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:r,tensor:i,dataType:a,shape:n,fallbackDataType:s}=e;this.sessionId=t,this.mlContext=r,this.mlTensor=i,this.dataType=a,this.tensorShape=n,this.fallbackDataType=s}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return yi(this.dataType,this.tensorShape)}destroy(){Me("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),r=jr(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(r);return}else return r.buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,r){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===r.length&&this.tensorShape.every((i,a)=>i===r[a])}setIsDataConverted(e){this.isDataConverted=e}},wi=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,r,i){let a=this.tensorManager.getMLContext(e),n;if(!a.opSupportLimits().input.dataTypes.includes(t)){if(n=ir.get(t),!n||!a.opSupportLimits().input.dataTypes.includes(n))throw new Error(`WebNN backend does not support data type: ${t}`);Me("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${n}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(a,t,r))return this.wrapper.tensor;if(i){if(this.wrapper.byteLength!==yi(t,r))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let s=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,r,s,!0,!0,n),i&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")t=_r(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else Me("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,r;if(this.activeUpload){let i=(t=this.wrapper)!=null&&t.isDataConverted?jr(this.activeUpload,(r=this.wrapper)==null?void 0:r.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(i):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(i);return}else return i.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},ta=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=Wt();return this.tensorTrackersById.set(e,new wi(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,r,i,a){Me("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${r}, shape: ${i}, copyOld: ${a}}`);let n=this.tensorTrackersById.get(t);if(!n)throw new Error("Tensor not found.");return n.ensureTensor(e,r,i,a)}upload(e,t){let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");r.upload(t)}async download(e,t){Me("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");return r.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,r,i){let a=this.getMLContext(e),n=Wt(),s=new _i({sessionId:e,context:a,tensor:t,dataType:r,shape:i});return this.tensorTrackersById.set(n,new wi(this,s)),this.externalTensors.add(s),n}async getCachedTensor(e,t,r,i,a,n,s){let o=this.getMLContext(e);for(let[l,d]of this.freeTensors.entries())if(d.canReuseTensor(o,t,r)){Me("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}`);let p=this.freeTensors.splice(l,1)[0];return p.sessionId=e,p}Me("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}}`);let u=await o.createTensor({dataType:s??t,shape:r,dimensions:r,usage:i,writable:a,readable:n});return new _i({sessionId:e,context:o,tensor:u,dataType:t,shape:r,fallbackDataType:s})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},ra=(...e)=>new ta(...e)}),wr,ia,aa,na=E(()=>{be(),Ct(),yr(),Ea(),Dt(),wr=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),ia=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let r=Object.keys(e).sort(),i=Object.keys(t).sort();return r.length===i.length&&r.every((a,n)=>a===i[n]&&e[a]===t[a])},aa=class{constructor(e){this.tensorManager=ra(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,fi(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){Me("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){Me("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let r of t)Me("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${r}}`),this.tensorManager.releaseTensorId(r);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let r=this.mlContextCache.findIndex(i=>i.gpuDevice===e);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:i}),i}}else if(e===void 0){let r=this.mlContextCache.findIndex(i=>i.options===void 0&&i.gpuDevice===void 0);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:i}),i}}let t=this.mlContextCache.findIndex(r=>ia(r.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:r}),r}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);if(r.delete(e),r.size===0){this.sessionIdsByMLContext.delete(t);let i=this.mlContextCache.findIndex(a=>a.mlContext===t);i!==-1&&this.mlContextCache.splice(i,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){Me("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,i,a){let n=wr.get(r);if(!n)throw new Error(`Unsupported ONNX data type: ${r}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,n,i,a)}async createTemporaryTensor(e,t,r){Me("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${r}}`);let i=wr.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,a,i,r,!1);let n=this.temporarySessionTensorIds.get(e);return n?n.push(a):this.temporarySessionTensorIds.set(e,[a]),a}uploadTensor(e,t){if(!Se().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");Me("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return rr(r,t)}}registerMLTensor(e,t,r,i){let a=wr.get(r);if(!a)throw new Error(`Unsupported ONNX data type: ${r}`);let n=this.tensorManager.registerTensor(e,t,a,i);return Me("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${a}, dimensions: ${i}} -> {tensorId: ${n}}`),n}registerMLConstant(e,t,r,i,a,n,s=!1){if(!n)throw new Error("External mounted files are not available.");let o=e;e.startsWith("./")&&(o=e.substring(2));let u=n.get(o);if(!u)throw new Error(`File with name ${o} not found in preloaded files.`);if(t+r>u.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let l=u.slice(t,t+r).buffer,d;switch(a.dataType){case"float32":d=new Float32Array(l);break;case"float16":d=typeof Float16Array<"u"&&Float16Array.from?new Float16Array(l):new Uint16Array(l);break;case"int32":d=new Int32Array(l);break;case"uint32":d=new Uint32Array(l);break;case"int64":if(s){let p=_r(new Uint8Array(l),"int64");d=new Int32Array(p.buffer),a.dataType="int32"}else d=new BigInt64Array(l);break;case"uint64":d=new BigUint64Array(l);break;case"int8":d=new Int8Array(l);break;case"int4":case"uint4":case"uint8":d=new Uint8Array(l);break;default:throw new Error(`Unsupported data type: ${a.dataType} in creating WebNN Constant from external data.`)}return Me("verbose",()=>`[WebNN] registerMLConstant {dataType: ${a.dataType}, shape: ${a.shape}}} ${s?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),i.constant(a,d)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let r=this.sessionGraphInputs.get(e);return r?r.includes(t):!1}isGraphOutput(e,t){let r=this.sessionGraphOutputs.get(e);return r?r.includes(t):!1}isGraphInputOutputTypeSupported(e,t,r=!0){let i=this.mlContextBySessionId.get(e),a=wr.get(zt(t));return typeof a>"u"?!1:r?!!(i!=null&&i.opSupportLimits().input.dataTypes.includes(a)):!!(i!=null&&i.opSupportLimits().output.dataTypes.includes(a))}flush(){}}}),bi=E(()=>{}),$i,vi,Kr,xi,Si,Ti,sa,oa,Ia,nn=E(()=>{Dt(),bi(),$i=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),vi=[],Kr=e=>Math.ceil(Number(e)/16)*16,xi=e=>{for(let t=0;t<vi.length;t++){let r=vi[t];if(e<=r)return r}return Math.ceil(e/16)*16},Si=1,Ti=()=>Si++,sa=async(e,t,r,i)=>{let a=Kr(r),n=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,n,0,a),e.flush(),await n.mapAsync(GPUMapMode.READ);let o=n.getMappedRange();if(i){let u=i();return u.set(new Uint8Array(o,0,r)),u}else return new Uint8Array(o.slice(0,r))}finally{n.destroy()}},oa=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of $i)vi.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let r=t.buffer,i=t.byteOffset,a=t.byteLength,n=Kr(a),s=this.storageCache.get(e);if(!s)throw new Error("gpu data for uploading does not exist");if(Number(s.originalSize)!==a)throw new Error(`inconsistent data size. gpu data size=${s.originalSize}, data size=${a}`);let o=this.backend.device.createBuffer({mappedAtCreation:!0,size:n,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),u=o.getMappedRange();new Uint8Array(u).set(new Uint8Array(r,i,a)),o.unmap();let l=this.backend.device.createCommandEncoder();l.copyBufferToBuffer(o,0,s.gpuData.buffer,0,n),this.backend.device.queue.submit([l.finish()]),o.destroy(),Me("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let i=this.storageCache.get(t);if(!i)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==i.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=Kr(r.originalSize),n=this.backend.getCommandEncoder();this.backend.endComputePass(),n.copyBufferToBuffer(r.gpuData.buffer,0,i.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let i;if(r){if(i=r[0],e===r[1])return Me("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, buffer is the same, skip.`),i;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else i=Ti();return this.storageCache.set(i,{gpuData:{id:i,type:0,buffer:e},originalSize:t}),Me("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, registered.`),i}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),Me("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=xi(e),i,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,n=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||n){let o=(a?this.freeBuffers:this.freeUniformBuffers).get(r);o?o.length>0?i=o.pop():i=this.backend.device.createBuffer({size:r,usage:t}):i=this.backend.device.createBuffer({size:r,usage:t})}else i=this.backend.device.createBuffer({size:r,usage:t});let s={id:Ti(),type:0,buffer:i};return this.storageCache.set(s.id,{gpuData:s,originalSize:Number(e)}),Me("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${s.id}`),s}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,r=this.storageCache.get(t);if(!r){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return Me("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${r.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(r.gpuData.buffer),r.originalSize}async download(e,t){let r=this.storageCache.get(Number(e));if(!r)throw new Error("data does not exist");await sa(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=$i.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(Me("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(r=>{r.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Ia=(...e)=>new oa(...e)}),c,g,b=E(()=>{c=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},g=e=>new c(e)}),I,S,R,C,k,M,F,j,K,U,ne,A,Z,Qe,ze,ke,He,de=E(()=>{be(),he(),I=64,S=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},R=(e,t=1)=>{let r=S(e,t);return typeof r=="string"?r:r[0]},C=(e,t=1)=>{let r=S(e,t);return typeof r=="string"?r:r[1]},k=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:N.computeStrides(r)})}),t},M=e=>e%4===0?4:e%2===0?2:1,F=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,j=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,K=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,U=(e,t,r,i)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?i==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:i==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,ne=(e,t,r,i,a)=>{let n=typeof r=="number",s=n?r:r.length,o=[...new Array(s).keys()],u=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,l=S(t,a),d=typeof l=="string"?l:l[1],p=typeof l=="string"?l:l[0],f={indices:u,value:d,storage:p,tensor:t},h=G=>typeof G=="string"?G:`${G}u`,m={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},y=n?"uniforms.":"",$=`${y}${e}_shape`,w=`${y}${e}_strides`,_="";for(let G=0;G<s-1;G++)_+=`
    let dim${G} = current / ${U(w,G,s)};
    let rest${G} = current % ${U(w,G,s)};
    indices[${G}] = dim${G};
    current = rest${G};
    `;_+=`indices[${s-1}] = current;`;let T=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${f.indices} {
    var indices: ${f.indices};
    var current = offset;
    ${_}
    return indices;
  }`,x=G=>(m.offsetToIndices=!0,s<2?G:`o2i_${e}(${G})`),z=[];if(s>=2)for(let G=s-1;G>=0;G--)z.push(`${U(w,G,s)} * (indices[${G}])`);let P=s<2?"":`
  fn i2o_${e}(indices: ${f.indices}) -> u32 {
    return ${z.join("+")};
  }`,B=G=>(m.indicesToOffset=!0,s<2?G:`i2o_${e}(${G})`),L=(...G)=>s===0?"0u":`${f.indices}(${G.map(h).join(",")})`,V=(G,te)=>s<2?`${G}`:`${U(G,te,s)}`,J=(G,te,ge)=>s<2?`${G}=${ge};`:`${U(G,te,s)}=${ge};`,we={},oe=(G,te)=>{m.broadcastedIndicesToOffset=!0;let ge=`${te.name}broadcastedIndicesTo${e}Offset`;if(ge in we)return`${ge}(${G})`;let Re=[];for(let Ut=s-1;Ut>=0;Ut--){let ki=te.indicesGet("outputIndices",Ut+te.rank-s);Re.push(`${V(w,Ut)} * (${ki} % ${V($,Ut)})`)}return we[ge]=`fn ${ge}(outputIndices: ${te.type.indices}) -> u32 {
             return ${Re.length>0?Re.join("+"):"0u"};
           }`,`${ge}(${G})`},ye=(G,te)=>(()=>{if(f.storage===f.value)return`${e}[${G}]=${te};`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`${e}[${G}]=vec2<u32>(u32(${te}), select(0u, 0xFFFFFFFFu, ${te} < 0));`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`${e}[${G}]=vec2<u32>(u32(${te}), 0u);`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`${e}[${G}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${te}));`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),Ue=G=>(()=>{if(f.storage===f.value)return`${e}[${G}]`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`i32(${e}[${G}].x)`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`u32(${e}[${G}].x)`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${G}] & 0xFFu), bool(${e}[${G}] & 0xFF00u), bool(${e}[${G}] & 0xFF0000u), bool(${e}[${G}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),Ae=s<2?"":`
  fn get_${e}ByIndices(indices: ${f.indices}) -> ${d} {
    return ${Ue(`i2o_${e}(indices)`)};
  }`,me=s<2?"":(()=>{let G=o.map(ge=>`d${ge}: u32`).join(", "),te=o.map(ge=>`d${ge}`).join(", ");return`
  fn get_${e}(${G}) -> ${d} {
    return get_${e}ByIndices(${L(te)});
  }`})(),Oe=(...G)=>{if(G.length!==s)throw new Error(`indices length must be ${s}`);let te=G.map(h).join(",");return s===0?Ue("0u"):s===1?Ue(te[0]):(m.get=!0,m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}(${te})`)},pe=G=>s<2?Ue(G):(m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}ByIndices(${G})`),Te=s<2?"":`
  fn set_${e}ByIndices(indices: ${f.indices}, value: ${d}) {
    ${ye(`i2o_${e}(indices)`,"value")}
  }`,_t=s<2?"":(()=>{let G=o.map(ge=>`d${ge}: u32`).join(", "),te=o.map(ge=>`d${ge}`).join(", ");return`
  fn set_${e}(${G}, value: ${d}) {
    set_${e}ByIndices(${L(te)}, value);
  }`})();return{impl:()=>{let G=[],te=!1;return m.offsetToIndices&&(G.push(T),te=!0),m.indicesToOffset&&(G.push(P),te=!0),m.broadcastedIndicesToOffset&&(Object.values(we).forEach(ge=>G.push(ge)),te=!0),m.set&&(G.push(_t),te=!0),m.setByIndices&&(G.push(Te),te=!0),m.get&&(G.push(me),te=!0),m.getByIndices&&(G.push(Ae),te=!0),!n&&te&&G.unshift(`const ${$} = ${f.indices}(${r.join(",")});`,`const ${w} = ${f.indices}(${N.computeStrides(r).join(",")});`),G.join(`
`)},type:f,offsetToIndices:x,indicesToOffset:B,broadcastedIndicesToOffset:oe,indices:L,indicesGet:V,indicesSet:J,set:(...G)=>{if(G.length!==s+1)throw new Error(`indices length must be ${s}`);let te=G[s];if(typeof te!="string")throw new Error("value must be string");let ge=G.slice(0,s).map(h).join(",");return s===0?ye("0u",te):s===1?ye(ge[0],te):(m.set=!0,m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}(${ge}, ${te})`)},setByOffset:ye,setByIndices:(G,te)=>s<2?ye(G,te):(m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}ByIndices(${G}, ${te});`),get:Oe,getByOffset:Ue,getByIndices:pe,usage:i,name:e,strides:w,shape:$,rank:s}},A=(e,t,r,i=1)=>ne(e,t,r,"input",i),Z=(e,t,r,i=1)=>ne(e,t,r,"output",i),Qe=(e,t,r)=>ne(e,t,r,"atomicOutput",1),ze=(e,t,r,i=1)=>ne(e,t,r,"internal",i),ke=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=I){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],i=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||i>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*i>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,n=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,s=a?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*r*i}u + local_idx;`;return`@compute @workgroup_size(${t}, ${r}, ${i})
  fn main(${n}) {
    ${s}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let r=e.usage==="input"?"read":"read_write",i=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${t}) var<storage, ${r}> ${e.name}: array<${i}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,r=1){return this.uniforms.push({name:e,type:t,length:r}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:r,length:i}of this.uniforms)if(i&&i>4)r==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${r}>, ${Math.ceil(i/8)}>`):e.push(`${t}:array<vec4<${r}>, ${Math.ceil(i/4)}>`);else{let a=i==null||i===1?r:`vec${i}<${r}>`;e.push(`${t}:${a}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},He=(e,t)=>new ke(e,t)}),Ze,Pe,dt,ft,Tt,Zr,bt,ua,Pt,ht=E(()=>{be(),he(),b(),de(),Ze=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Pe=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),dt=(e,t)=>N.sortBasedOnPerm(e,Pe(e.length,t)),ft=(e,t,r,i)=>{let a=`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let n=0;n<t;++n)a+=`a[${e[n]}]=i[${n}];`;return a+="return a;}"},Tt=(e,t)=>{let r=[],i=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&i.push(t[a]);return{newShape:r,newPerm:i}},Zr=(e,t)=>{let r=0;for(let i=0;i<e.length;++i)if(t[e[i]]!==1){if(e[i]<r)return!1;r=e[i]}return!0},bt=(e,t)=>{let r=e.dataType,i=e.dims.length,a=Pe(i,t),n=dt(e.dims,a),s=e.dims,o=n,u=i<2||Zr(a,e.dims),l;if(u)return l=m=>{let y=A("input",r,s,4),$=Z("output",r,o,4);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let m=N.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(m/4)}]}},getShaderSource:l};let{newShape:d,newPerm:p}=Tt(e.dims,a),f=N.areEqual(p,[2,3,1]),h=N.areEqual(p,[3,1,2]);if(d.length===2||f||h){s=f?[d[0],d[1]*d[2]]:h?[d[0]*d[1],d[2]]:d,o=[s[1],s[0]];let m=16;return l=y=>{let $=A("a",r,s.length),w=Z("output",r,o.length);return`
  ${y.registerUniform("output_size","u32").declareVariables($,w)}
  var<workgroup> tile : array<array<${w.type.value}, ${m+1}>, ${m}>;
  ${y.mainStart([m,m,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${m} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${m}u + local_id.x;
    let input_row = workgroup_id_x * ${m}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${$.getByIndices(`${$.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${m}u + local_id.x;
    let output_row = workgroup_id_y * ${m}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${w.setByIndices(`${w.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let y=N.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(o[1]/m),y:Math.ceil(o[0]/m)},programUniforms:[{type:12,data:y},...k(s,o)]}},getShaderSource:l}}return l=m=>{let y=A("a",r,s.length),$=Z("output",r,o.length);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}

  ${ft(a,i,y,$)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${$.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${$.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let m=N.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...k(s,o)]}},getShaderSource:l}},ua=(e,t)=>{Ze(e.inputs,t.perm),e.compute(bt(e.inputs[0],t.perm))},Pt=e=>g({perm:e.perm})}),la,De,Gt,ka,jt,Qr,it,$t,Ei,Xr,Rt,Ca,Ht,Kt,br,at,Je,Nt,za,Aa,_s,Tc=E(()=>{be(),he(),de(),on(),ht(),la={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},De={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},Gt={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},ka={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},jt=(e,t)=>{let r=[];for(let i=t-e;i<t;++i)r.push(i);return r},Qr=(e,t)=>{let r=[],i=e.length;for(let n=0;n<i;n++)t.indexOf(n)===-1&&r.push(e[n]);let a=t.map(n=>e[n]);return[r,a]},it=(e,t)=>{let r=e.length+t.length,i=[],a=0;for(let n=0;n<r;n++)t.indexOf(n)===-1?i.push(e[a++]):i.push(1);return i},$t=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},Ei=(e,t)=>{let r=[];if(!$t(e,t)){for(let i=0;i<t;++i)e.indexOf(i)===-1&&r.push(i);e.forEach(i=>r.push(i))}return r},Xr=(e,t,r,i,a,n,s)=>{let o=r[0].dims,u=N.size(n),l=N.size(s),d=A("_A",r[0].dataType,o),p=Z("output",a,n),f=64;u===1&&(f=256);let h=`
          var<workgroup> aBestValues : array<f32, ${f}>;
       `,m=y=>`
        ${y.registerUniform("reduceSize","u32").declareVariables(d,p)}
        ${h}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${y.mainStart(f)}

          let outputIndex = global_idx / ${f};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${Gt[i]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${f}) {
           let candidate = f32(${d.getByOffset("offset + k")});
           bestValue = ${la[i]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${f}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${De[i]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${p.setByOffset("outputIndex",`${i==="mean"?`${p.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${p.type.storage}(${ka[i]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${f}`,inputDependencies:["type"]},getShaderSource:m,getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:u},programUniforms:[{type:12,data:l}]})}},Rt=(e,t,r,i)=>{let a=e.inputs.length===1?r:sn(e.inputs,r),n=a.axes;n.length===0&&!a.noopWithEmptyAxes&&(n=e.inputs[0].dims.map((h,m)=>m));let s=N.normalizeAxes(n,e.inputs[0].dims.length),o=s,u=e.inputs[0],l=Ei(o,e.inputs[0].dims.length);l.length>0&&(u=e.compute(bt(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],o=jt(o.length,u.dims.length));let[d,p]=Qr(u.dims,o),f=d;a.keepDims&&(f=it(d,s)),e.compute(Xr(t,a.cacheKey,[u],i,e.inputs[0].dataType,f,p),{inputs:[u]})},Ca=(e,t)=>{Rt(e,"ReduceMeanShared",t,"mean")},Ht=(e,t)=>{Rt(e,"ReduceL1Shared",t,"l1")},Kt=(e,t)=>{Rt(e,"ReduceL2Shared",t,"l2")},br=(e,t)=>{Rt(e,"ReduceLogSumExpShared",t,"logSumExp")},at=(e,t)=>{Rt(e,"ReduceMaxShared",t,"max")},Je=(e,t)=>{Rt(e,"ReduceMinShared",t,"min")},Nt=(e,t)=>{Rt(e,"ReduceProdShared",t,"prod")},za=(e,t)=>{Rt(e,"ReduceSumShared",t,"sum")},Aa=(e,t)=>{Rt(e,"ReduceSumSquareShared",t,"sumSquare")},_s=(e,t)=>{Rt(e,"ReduceLogSumShared",t,"logSum")}}),Zt,ws,Oa,sn,Qt,bs,$s,vs,xs,Ss,Ts,Es,Is,ks,Cs,Xt,zs,As,Os,Rs,Ms,Bs,Ds,Ps,Us,Ns,on=E(()=>{be(),he(),b(),de(),Tc(),Zt=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},ws=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Oa=(e,t,r,i,a,n,s=!1,o=!1)=>{let u=[],l=r[0].dims,d=l.length,p=N.normalizeAxes(a,d),f=!o&&p.length===0;l.forEach((y,$)=>{f||p.indexOf($)>=0?s&&u.push(1):u.push(y)});let h=u.length,m=N.size(u);return{name:e,shaderCache:t,getShaderSource:y=>{let $=[],w=A("_A",r[0].dataType,d),_=Z("output",n,h),T=i(w,_,p),x=T[2];for(let z=0,P=0;z<d;z++)f||p.indexOf(z)>=0?(s&&P++,x=`for(var j${z}: u32 = 0; j${z} < ${l[z]}; j${z}++) {
                  ${T[2].includes("last_index")?`let last_index = j${z};`:""}
                  ${w.indicesSet("input_indices",z,`j${z}`)}
                  ${x}
                }`):($.push(`${w.indicesSet("input_indices",z,_.indicesGet("output_indices",P))};`),P++);return`

        ${y.registerUniform("output_size","u32").declareVariables(w,_)}

        ${y.mainStart()}
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${w.type.indices};
          let output_indices = ${_.offsetToIndices("global_idx")};

          ${$.join(`
`)}
          ${T[0]}       // init ops for reduce max/min
          ${T[1]}
          ${x}
          ${T[3]}
          ${T.length===4?_.setByOffset("global_idx","value"):T.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:u,dataType:n}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...k(l,u)]})}},sn=(e,t)=>{let r=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(i=>r.push(Number(i))),g({axes:r,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Qt=(e,t,r,i)=>{let a=e.inputs,n=a.length===1?r:sn(a,r);e.compute(Oa(t,{hint:n.cacheKey,inputDependencies:["rank"]},[a[0]],n.noopWithEmptyAxes&&n.axes.length===0?ws:i,n.axes,a[0].dataType,n.keepDims,n.noopWithEmptyAxes),{inputs:[0]})},bs=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceLogSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},$s=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceL1",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},vs=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceL2",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},xs=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceLogSumExp",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},Ss=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceMax",t,(r,i,a)=>{let n=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&n.push(r.indicesSet("input_indices",s,0));return[`${n.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},Ts=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceMean",t,(r,i,a)=>{let n=1;for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&(n*=e.inputs[0].dims[s]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${i.type.value}(sum / ${n});`]})},Es=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceMin",t,(r,i,a)=>{let n=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&n.push(`input_indices[${s}] = 0;`);return[`${n.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},Is=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceProd",t,(r,i)=>[`var value = ${i.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},ks=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Cs=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceSumSquare",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Xt=(e,t,r)=>{if(t.length===0)return r;let i=1,a=1;for(let n=0;n<t.length;n++)t.indexOf(n)===-1?i*=e[n]:a*=e[n];return a<32&&i>1024},zs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ts(e,t):Ca(e,t)},As=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?$s(e,t):Ht(e,t)},Os=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vs(e,t):Kt(e,t)},Rs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xs(e,t):br(e,t)},Ms=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ss(e,t):at(e,t)},Bs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Es(e,t):Je(e,t)},Ds=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Is(e,t):Nt(e,t)},Ps=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ks(e,t):za(e,t)},Us=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Cs(e,t):Aa(e,t)},Ns=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bs(e,t):_s(e,t)}}),un,Ls,qs,ln,Ec=E(()=>{be(),b(),on(),un=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},Ls=(e,t)=>{un(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Oa("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},qs=(e,t)=>{un(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Oa("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},ln=e=>g(e)}),Vs,Ra,Fs,Ws,Gs,da,js,Hs,dn=E(()=>{be(),he(),bi(),de(),Vs=(e,t)=>{let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4],o=e[5];if(s&&o)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=r.dims[0],l=r.dims[1],d=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(i.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(i.dims[0]!==d)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==i.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let p=a.dims[0]/3,f=p,h=f;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let T of t.qkvHiddenSizes)if(T%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");p=t.qkvHiddenSizes[0],f=t.qkvHiddenSizes[1],h=t.qkvHiddenSizes[2]}let m=l;if(p!==f)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==p+f+h)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let y=0;if(s){if(f!==h)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==f/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(y=s.dims[3])}let $=m+y,w=-1,_=0;if(n)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(o){if(o.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(o.dims[0]!==u||o.dims[1]!==t.numHeads||o.dims[2]!==l||o.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:l,pastSequenceLength:y,kvSequenceLength:m,totalSequenceLength:$,maxSequenceLength:w,inputHiddenSize:d,hiddenSize:p,vHiddenSize:h,headSize:Math.floor(p/t.numHeads),vHeadSize:Math.floor(h/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:_,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Ra=(e,t,r)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e==null?void 0:e.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${r?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,Fs=(e,t,r,i,a,n,s,o)=>{let u=M(s?1:n),l=64,d=n/u;d<l&&(l=32);let p=Math.ceil(n/u/l),f=[{type:12,data:t},{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:d},{type:12,data:p}],h=R(e.dataType,u),m=C(1,u),y=["type"];s&&y.push("type"),o&&y.push("type");let $=w=>{let _=Z("x",e.dataType,e.dims,u),T=[_],x=s?A("seq_lens",s.dataType,s.dims):void 0;x&&T.push(x);let z=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;z&&T.push(z);let P=C(e.dataType),B=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${w.registerUniforms(B).declareVariables(...T)}
  ${w.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Ra(x,z,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${s?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${m}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${m}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(u){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${m}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${m}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(u){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${_.type.value}(${P}(1.0) / ${P}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${m}(x[offset + i]);
        x[offset + i] = ${_.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${s?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${_.type.value}(${P}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${h};${u}`,inputDependencies:y},getShaderSource:$,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:a,z:t*r},programUniforms:f})}},Ws=(e,t,r,i,a,n,s,o,u)=>{let l=s+n.kvSequenceLength,d=[n.batchSize,n.numHeads,n.sequenceLength,l],p=e>1&&i,f=n.kvNumHeads?n.kvNumHeads:n.numHeads,h=p?[n.batchSize,f,l,n.headSize]:void 0,m=n.nReps?n.nReps:1,y=n.scale===0?1/Math.sqrt(n.headSize):n.scale,$=M(n.headSize),w=n.headSize/$,_=12,T={x:Math.ceil(l/_),y:Math.ceil(n.sequenceLength/_),z:n.batchSize*n.numHeads},x=[{type:12,data:n.sequenceLength},{type:12,data:w},{type:12,data:l},{type:12,data:n.numHeads},{type:12,data:n.headSize},{type:1,data:y},{type:12,data:s},{type:12,data:n.kvSequenceLength},{type:12,data:m}],z=p&&i&&N.size(i.dims)>0,P=["type","type"];z&&P.push("type"),a&&P.push("type"),o&&P.push("type"),u&&P.push("type");let B=[{dims:d,dataType:t.dataType,gpuDataType:0}];p&&B.push({dims:h,dataType:t.dataType,gpuDataType:0});let L=V=>{let J=A("q",t.dataType,t.dims,$),we=A("key",r.dataType,r.dims,$),oe=[J,we];if(z){let Te=A("past_key",i.dataType,i.dims,$);oe.push(Te)}a&&oe.push(A("attention_bias",a.dataType,a.dims));let ye=o?A("seq_lens",o.dataType,o.dims):void 0;ye&&oe.push(ye);let Ue=u?A("total_sequence_length_input",u.dataType,u.dims):void 0;Ue&&oe.push(Ue);let Ae=Z("output",t.dataType,d),me=[Ae];p&&me.push(Z("present_key",t.dataType,h,$));let Oe=C(1,$),pe=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${_}u;

  var<workgroup> tileQ: array<${J.type.storage}, ${_*_}>;
  var<workgroup> tileK: array<${J.type.storage}, ${_*_}>;
  ${V.registerUniforms(pe).declareVariables(...oe,...me)}
  ${V.mainStart([_,_,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${m===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${m===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Ra(ye,Ue,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${z&&p?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${p?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${Oe}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${z&&p?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${p?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${Oe}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch($){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${$}`)}})()};
        output[outputIdx] = ${Ae.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${$};${a!==void 0};${i!==void 0};${e}`,inputDependencies:P},getRunData:()=>({outputs:B,dispatchGroup:T,programUniforms:x}),getShaderSource:L}},Gs=(e,t,r,i,a,n,s=void 0,o=void 0)=>{let u=n+a.kvSequenceLength,l=a.nReps?a.nReps:1,d=a.vHiddenSize*l,p=e>1&&i,f=a.kvNumHeads?a.kvNumHeads:a.numHeads,h=p?[a.batchSize,f,u,a.headSize]:void 0,m=[a.batchSize,a.sequenceLength,d],y=12,$={x:Math.ceil(a.vHeadSize/y),y:Math.ceil(a.sequenceLength/y),z:a.batchSize*a.numHeads},w=[{type:12,data:a.sequenceLength},{type:12,data:u},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:12,data:d},{type:12,data:n},{type:12,data:a.kvSequenceLength},{type:12,data:l}],_=p&&i&&N.size(i.dims)>0,T=["type","type"];_&&T.push("type"),s&&T.push("type"),o&&T.push("type");let x=[{dims:m,dataType:t.dataType,gpuDataType:0}];p&&x.push({dims:h,dataType:t.dataType,gpuDataType:0});let z=P=>{let B=A("probs",t.dataType,t.dims),L=A("v",r.dataType,r.dims),V=[B,L];_&&V.push(A("past_value",i.dataType,i.dims));let J=s?A("seq_lens",s.dataType,s.dims):void 0;s&&V.push(J);let we=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;o&&V.push(we);let oe=[Z("output",t.dataType,m)];p&&oe.push(Z("present_value",t.dataType,h));let ye=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${y}u;
  var<workgroup> tileQ: array<${B.type.value}, ${y*y}>;
  var<workgroup> tileV: array<${B.type.value}, ${y*y}>;
  ${P.registerUniforms(ye).declareVariables(...V,...oe)}
  ${P.mainStart([y,y,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Ra(J,we,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${_&&p?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${p?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${B.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${_&&p?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${p?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${i!==void 0};${e}`,inputDependencies:T},getRunData:()=>({outputs:x,dispatchGroup:$,programUniforms:w}),getShaderSource:z}},da=(e,t,r,i,a,n,s,o,u,l,d=void 0,p=void 0)=>{let f=Math.min(e.outputCount,1+(s?1:0)+(o?1:0)),h=f>1?l.pastSequenceLength:0,m=h+l.kvSequenceLength,y=u&&N.size(u.dims)>0?u:void 0,$=[t,r];f>1&&s&&N.size(s.dims)>0&&$.push(s),y&&$.push(y),d&&$.push(d),p&&$.push(p);let w=e.compute(Ws(f,t,r,s,y,l,h,d,p),{inputs:$,outputs:f>1?[-1,1]:[-1]})[0];e.compute(Fs(w,l.batchSize,l.numHeads,h,l.sequenceLength,m,d,p),{inputs:d&&p?[w,d,p]:[w],outputs:[]});let _=[w,i];f>1&&o&&N.size(o.dims)>0&&_.push(o),d&&_.push(d),p&&_.push(p),e.compute(Gs(f,w,i,o,l,h,d,p),{inputs:_,outputs:f>1?[0,2]:[0]})},js=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],i=t.sequenceLength,a=t.inputHiddenSize,n=t.headSize,s=12,o={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},u=[e.inputs[0],e.inputs[1],e.inputs[2]],l=[{type:12,data:i},{type:12,data:a},{type:12,data:n},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],d=p=>{let f=Z("output_q",u[0].dataType,r),h=Z("output_k",u[0].dataType,r),m=Z("output_v",u[0].dataType,r),y=A("input",u[0].dataType,u[0].dims),$=A("weight",u[1].dataType,u[1].dims),w=A("bias",u[2].dataType,u[2].dims),_=y.type.storage,T=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${_}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${_}, ${s*s}>;
  var<workgroup> tileWeightK: array<${_}, ${s*s}>;
  var<workgroup> tileWeightV: array<${_}, ${s*s}>;
  ${p.registerUniforms(T).declareVariables(y,$,w,f,h,m)}
  ${p.mainStart([s,s,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${_}(0);
    var valueK = ${_}(0);
    var valueV = ${_}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:l}),getShaderSource:d},{inputs:u,outputs:[-1,-1,-1]})},Hs=(e,t)=>{let r=Vs(e.inputs,t),[i,a,n]=js(e,r);return da(e,i,a,n,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r)}}),Ks,Zs,Qs,Xs,Ic=E(()=>{ct(),be(),he(),b(),de(),Ks=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(i,a,n)=>{let s=a.length;if(s!==i.length)throw new Error(`${n}: num dimensions != ${s}`);a.forEach((o,u)=>{if(o!==i[u])throw new Error(`${n}: dim[${u}] do not match`)})};if(e[0].dims.length>1){let i=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,i,"Invalid input scale"),r(e[2].dims,i,"Invalid input B"),r(e[3].dims,i,"Invalid input mean"),r(e[4].dims,i,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},Zs=(e,t)=>{let{epsilon:r,spatial:i,format:a}=t,n=e[0].dims,s=i?M(n[n.length-1]):1,o=a==="NHWC"&&n.length>1?s:1,u=N.size(n)/s,l=i,d=l?n.length:n,p=A("x",e[0].dataType,e[0].dims,s),f=A("scale",e[1].dataType,e[1].dims,o),h=A("bias",e[2].dataType,e[2].dims,o),m=A("inputMean",e[3].dataType,e[3].dims,o),y=A("inputVar",e[4].dataType,e[4].dims,o),$=Z("y",e[0].dataType,d,s),w=()=>{let T="";if(i)T=`let cOffset = ${n.length===1?"0u":a==="NHWC"?`outputIndices[${n.length-1}] / ${s}`:"outputIndices[1]"};`;else if(a==="NCHW")T=`
            ${$.indicesSet("outputIndices","0","0")}
            let cOffset = ${$.indicesToOffset("outputIndices")};`;else{T=`var cIndices = ${f.type.indices}(0);
                       cIndices[0] = outputIndices[${n.length-1}];`;for(let x=1;x<f.rank;x++)T+=`cIndices[${x}] = outputIndices[${x}];`;T+=`let cOffset = ${f.indicesToOffset("cIndices")};`}return T},_=T=>`
  const epsilon = ${r};
  ${T.registerUniform("outputSize","u32").declareVariables(p,f,h,m,y,$)}
  ${T.mainStart()}
  ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${$.offsetToIndices(`global_idx * ${s}`)};
    ${w()}
    let scale = ${f.getByOffset("cOffset")};
    let bias = ${h.getByOffset("cOffset")};
    let inputMean = ${m.getByOffset("cOffset")};
    let inputVar = ${y.getByOffset("cOffset")};
    let x = ${p.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${$.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${i}_${s}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:_,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l?[{type:12,data:u},...k(n)]:[{type:12,data:u}]})}},Qs=e=>g(e),Xs=(e,t)=>{let{inputs:r,outputCount:i}=e,a=Qs({...t,outputCount:i});if(Q.webgpu.validateInputContent&&Ks(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(Zs(r,a))}}),Ys,Js,eo,kc=E(()=>{he(),de(),Ys=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Js=e=>{let t=e[0].dims,r=e[0].dims[2],i=N.size(t)/4,a=e[0].dataType,n=A("input",a,t,4),s=A("bias",a,[r],4),o=A("residual",a,t,4),u=Z("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:l=>`
  const channels = ${r}u / 4;
  ${l.declareVariables(n,s,o,u)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let value = ${n.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${o.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},eo=e=>{Ys(e.inputs),e.compute(Js(e.inputs))}}),to,Fe,ro,io,ao,no,so,oo,uo,lo,po,co,fo,ho,mo,go,pa,yo,Ma,_o,wo,bo,$o,vo,xo,So,To,Eo,Io,ko,Co,zo,Ao,Oo,Ro,pn,Mo,cn,fn,Bo,Do,Po,Uo,No,Lo,hn=E(()=>{be(),he(),b(),de(),to=(e,t,r,i,a,n,s)=>{let o=Math.ceil(t/4),u="";typeof a=="string"?u=`${a}(a)`:u=a("a");let l=A("inputData",r,[o],4),d=Z("outputData",i,[o],4),p=[{name:"vec_size",type:"u32"}];return s&&p.push(...s),`
      ${e.registerUniforms(p).declareVariables(l,d)}

  ${n??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${d.setByOffset("global_idx",u)}
  }`},Fe=(e,t,r,i,a,n=e.dataType,s,o)=>{let u=[{type:12,data:Math.ceil(N.size(e.dims)/4)}];return s&&u.push(...s),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:l=>to(l,N.size(e.dims),e.dataType,n,r,i,o),getRunData:l=>({outputs:[{dims:e.dims,dataType:n}],dispatchGroup:{x:Math.ceil(N.size(l[0].dims)/64/4)},programUniforms:u})}},ro=e=>{e.compute(Fe(e.inputs[0],"Abs","abs"))},io=e=>{e.compute(Fe(e.inputs[0],"Acos","acos"))},ao=e=>{e.compute(Fe(e.inputs[0],"Acosh","acosh"))},no=e=>{e.compute(Fe(e.inputs[0],"Asin","asin"))},so=e=>{e.compute(Fe(e.inputs[0],"Asinh","asinh"))},oo=e=>{e.compute(Fe(e.inputs[0],"Atan","atan"))},uo=e=>{e.compute(Fe(e.inputs[0],"Atanh","atanh"))},lo=e=>g(e),po=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(Fe(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},co=e=>{let t,r,i=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=i?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=i?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return g({min:t,max:r})},fo=(e,t)=>{let r=t||co(e.inputs),i=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${i}>(uniforms.min), vec4<${i}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:i},{name:"max",type:i}]),{inputs:[0]})},ho=e=>{e.compute(Fe(e.inputs[0],"Ceil","ceil"))},mo=e=>{e.compute(Fe(e.inputs[0],"Cos","cos"))},go=e=>{e.compute(Fe(e.inputs[0],"Cosh","cosh"))},pa=e=>g(e),yo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"Elu",i=>`elu_vf32(${i})`,`
  const elu_alpha_ = ${r}(${t.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Ma=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,_o=e=>{let t=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Ma(t)))},wo=e=>{e.compute(Fe(e.inputs[0],"Exp","exp"))},bo=e=>{e.compute(Fe(e.inputs[0],"Floor","floor"))},$o=e=>{let t=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Ma(t)))},vo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"LeakyRelu",i=>`select(leaky_relu_alpha_ * ${i}, ${i}, ${i} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},xo=e=>{e.compute(Fe(e.inputs[0],"Not",t=>`!${t}`))},So=e=>{e.compute(Fe(e.inputs[0],"Neg",t=>`-${t}`))},To=e=>{e.compute(Fe(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Eo=e=>{let t=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},Io=e=>{e.compute(Fe(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},ko=e=>g(e),Co=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"HardSigmoid",i=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${i} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},zo=e=>{e.compute(Fe(e.inputs[0],"Sin","sin"))},Ao=e=>{e.compute(Fe(e.inputs[0],"Sinh","sinh"))},Oo=e=>{e.compute(Fe(e.inputs[0],"Sqrt","sqrt"))},Ro=e=>{e.compute(Fe(e.inputs[0],"Tan","tan"))},pn=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Mo=e=>{e.compute(Fe(e.inputs[0],"Tanh",pn))},cn=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${pn("v")};
}
`,fn=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Bo=e=>{let t=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"FastGelu",fn,cn(t),void 0,e.inputs[0].dataType))},Do=(e,t)=>{let r=C(e.inputs[0].dataType);return e.compute(Fe(e.inputs[0],"ThresholdedRelu",i=>`select(vec4<${r}>(0.0), ${i}, ${i} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},Po=e=>{e.compute(Fe(e.inputs[0],"Log","log"))},Uo=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,No=e=>`quick_gelu_impl(${e})`,Lo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Fe(e.inputs[0],"QuickGelu",No,Uo(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),qo,Vo,Fo,Cc=E(()=>{he(),de(),hn(),qo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Vo=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=A("input",e[0].dataType,e[0].dims,4),i=A("bias",e[0].dataType,[e[0].dims[2]],4),a=Z("output",e[0].dataType,t,4),n=N.size(t)/4,s=R(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)}}),getShaderSource:o=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${o.declareVariables(r,i,a)}

  ${Ma(s)}

  ${o.mainStart()}
    ${o.guardAgainstOutOfBoundsWorkgroupSizes(n)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${a.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},Fo=e=>{qo(e.inputs),e.compute(Vo(e.inputs))}}),Wo,Go,Yt,jo,Ho,Ko,Zo,Qo,Xo,Yo,Jo,eu,tu,zc=E(()=>{be(),he(),de(),Wo=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f,h;typeof o=="string"?f=h=(_,T)=>`${o}((${_}),(${T}))`:typeof o=="function"?f=h=o:(f=o.scalar,h=o.vector);let m=Z("outputData",d,i.length,4),y=A("aData",u,t.length,4),$=A("bData",l,r.length,4),w;if(a)if(n){let _=N.size(t)===1,T=N.size(r)===1,x=t.length>0&&t[t.length-1]%4===0,z=r.length>0&&r[r.length-1]%4===0;_||T?w=m.setByOffset("global_idx",h(_?`${y.type.value}(${y.getByOffset("0")}.x)`:y.getByOffset("global_idx"),T?`${$.type.value}(${$.getByOffset("0")}.x)`:$.getByOffset("global_idx"))):w=`
            let outputIndices = ${m.offsetToIndices("global_idx * 4u")};
            let offsetA = ${y.broadcastedIndicesToOffset("outputIndices",m)};
            let offsetB = ${$.broadcastedIndicesToOffset("outputIndices",m)};
            ${m.setByOffset("global_idx",h(s||x?y.getByOffset("offsetA / 4u"):`${y.type.value}(${y.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||z?$.getByOffset("offsetB / 4u"):`${$.type.value}(${$.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else w=m.setByOffset("global_idx",h(y.getByOffset("global_idx"),$.getByOffset("global_idx")));else{if(!n)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let _=(T,x,z="")=>{let P=`aData[indexA${x}][componentA${x}]`,B=`bData[indexB${x}][componentB${x}]`;return`
            let outputIndices${x} = ${m.offsetToIndices(`global_idx * 4u + ${x}u`)};
            let offsetA${x} = ${y.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let offsetB${x} = ${$.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let indexA${x} = offsetA${x} / 4u;
            let indexB${x} = offsetB${x} / 4u;
            let componentA${x} = offsetA${x} % 4u;
            let componentB${x} = offsetB${x} % 4u;
            ${T}[${x}] = ${z}(${f(P,B)});
          `};d===9?w=`
            var data = vec4<u32>(0);
            ${_("data",0,"u32")}
            ${_("data",1,"u32")}
            ${_("data",2,"u32")}
            ${_("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:w=`
            ${_("outputData[global_idx]",0)}
            ${_("outputData[global_idx]",1)}
            ${_("outputData[global_idx]",2)}
            ${_("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(y,$,m)}

        ${p??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${w}
      }`},Go=(e,t,r,i,a,n,s=r.dataType)=>{let o=r.dims.map(y=>Number(y)??1),u=i.dims.map(y=>Number(y)??1),l=!N.areEqual(o,u),d=o,p=N.size(o),f=!1,h=!1,m=[l];if(l){let y=tr.calcShape(o,u,!1);if(!y)throw new Error("Can't perform binary op on the given tensors");d=y.slice(),p=N.size(d);let $=N.size(o)===1,w=N.size(u)===1,_=o.length>0&&o[o.length-1]%4===0,T=u.length>0&&u[u.length-1]%4===0;m.push($),m.push(w),m.push(_),m.push(T);let x=1;for(let z=1;z<d.length;z++){let P=o[o.length-z],B=u[u.length-z];if(P===B)x*=P;else break}x%4===0?(h=!0,f=!0):($||w||_||T)&&(f=!0)}else f=!0;return m.push(f),{name:e,shaderCache:{hint:t+m.map(y=>y.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:y=>Wo(y,o,u,d,f,l,h,a,r.dataType,i.dataType,s,n),getRunData:()=>({outputs:[{dims:d,dataType:s}],dispatchGroup:{x:Math.ceil(p/64/4)},programUniforms:[{type:12,data:Math.ceil(N.size(d)/4)},...k(o,u,d)]})}},Yt=(e,t,r,i,a,n)=>{e.compute(Go(t,a??"",e.inputs[0],e.inputs[1],r,i,n))},jo=e=>{Yt(e,"Add",(t,r)=>`${t}+${r}`)},Ho=e=>{Yt(e,"Div",(t,r)=>`${t}/${r}`)},Ko=e=>{Yt(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},Zo=e=>{Yt(e,"Mul",(t,r)=>`${t}*${r}`)},Qo=e=>{let t=A("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Yt(e,"Pow",{scalar:(r,i)=>`pow_custom(${r},${i})`,vector:(r,i)=>`pow_vector_custom(${r},${i})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},Xo=e=>{Yt(e,"Sub",(t,r)=>`${t}-${r}`)},Yo=e=>{Yt(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},Jo=e=>{Yt(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},eu=e=>{Yt(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},tu=e=>{Yt(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),ru,iu,au,nu,su,ou,Ac=E(()=>{be(),he(),b(),de(),ru=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,i=e[r],a=i.dataType,n=i.dims.length;e.forEach((s,o)=>{if(o!==r){if(s.dataType!==a)throw new Error("input tensors should be one type");if(s.dims.length!==n)throw new Error("input tensors should have the same shape");s.dims.forEach((u,l)=>{if(l!==t&&u!==i.dims[l])throw new Error("non concat dimensions must match")})}})},iu=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,au=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;++a){let n=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?i.push(n):a===0?i.push(`if (inputIndex == ${a}u) { ${n} }`):a===r-1?i.push(`else { ${n} }`):i.push(`else if (inputIndex == ${a}) { ${n} }`)}return i.join(`
`)},nu=(e,t,r,i)=>{let a=N.size(r),n=new Array(e.length),s=new Array(e.length),o=0,u=[],l=[],d=[{type:12,data:a}];for(let y=0;y<e.length;++y)o+=e[y].dims[t],n[y]=o,l.push(e[y].dims.length),s[y]=A(`input${y}`,i,l[y]),u.push("rank"),d.push({type:12,data:n[y]});for(let y=0;y<e.length;++y)d.push(...k(e[y].dims));d.push(...k(r));let p=Z("output",i,r.length),f=p.indicesGet("indices",t),h=Array.from(Array(n.length).keys()).map(y=>`uniforms.sizeInConcatAxis${y}`).join(","),m=y=>`

  ${(()=>{y.registerUniform("outputSize","u32");for(let $=0;$<e.length;$++)y.registerUniform(`sizeInConcatAxis${$}`,"u32");return y.declareVariables(...s,p)})()}

  ${iu(n.length,h)}

  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${p.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${f});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${n.length}u>(${h});
      ${f} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${au(s,p)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:i}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:d}),getShaderSource:m}},su=(e,t)=>{let r=e.inputs,i=r[0].dims,a=N.normalizeAxis(t.axis,i.length);ru(r,a);let n=i.slice();n[a]=r.reduce((o,u)=>o+(u.dims.length>a?u.dims[a]:0),0);let s=r.filter(o=>N.size(o.dims)>0);e.compute(nu(s,a,n,r[0].dataType),{inputs:s})},ou=e=>g({axis:e.axis})}),Yr,Jr,ei,mn,ti=E(()=>{be(),he(),Yr=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},Jr=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},ei=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},mn=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,i]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:i}}else if(t==="Clip"){let[r,i]=(e==null?void 0:e.activation_params)||[ea,Ft];return{activation:t,clipMax:i,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),mt,uu,gn=E(()=>{mt=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},uu=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),lu,Oc=E(()=>{lu=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),ca,yn,_n=E(()=>{be(),he(),de(),ti(),ca=(e,t,r,i,a)=>{let n=i-r;return`
      ${Array.from({length:r}).map((s,o)=>`
      if (${U(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,U(a,o+n,i))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join("")}
`},yn=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s[s.length-2],l=o[o.length-1],d=s[s.length-1],p=M(l),f=M(d),h=M(u),m=N.size(r)/p/h,y=e.length>2,$=i?i.slice(0,-2):r.slice(0,-2),w=[N.size($),u,l],_=[{type:12,data:m},{type:12,data:u},{type:12,data:l},{type:12,data:d}];Jr(t,_),_.push(...k($,s,o)),y&&_.push(...k(e[2].dims)),_.push(...k(w));let T=x=>{let z=ze("batch_dims",e[0].dataType,$.length),P=A("a",e[0].dataType,s.length,f),B=A("b",e[1].dataType,o.length,p),L=Z("output",e[0].dataType,w.length,p),V=R(L.type.tensor),J=Yr(t,L.type.value,V),we=[P,B],oe="";if(y){let Ae=a?p:1;we.push(A("bias",e[2].dataType,e[2].dims.length,Ae)),oe=`${a?`value += bias[col / ${Ae}];`:`value += ${L.type.value}(bias[row + i]);`}`}let ye=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];ei(t,ye);let Ue=()=>{let Ae=`var a_data: ${P.type.value};`;for(let me=0;me<f;me++)Ae+=`
              let b_data${me} = b[(b_offset + (k + ${me}) * uniforms.N + col) / ${p}];`;for(let me=0;me<h;me++){Ae+=`a_data = a[(a_offset + (row + ${me}) * uniforms.K + k) / ${f}];`;for(let Oe=0;Oe<f;Oe++)Ae+=`
            values[${me}] = fma(${B.type.value}(a_data${f===1?"":`[${Oe}]`}), b_data${Oe}, values[${me}]);
`}return Ae};return`
  ${x.registerUniforms(ye).registerInternalVariables(z).declareVariables(...we,L)}
  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${p})) * ${p};
    var index1 = global_idx / (uniforms.N / ${p});
    let stride1 = uniforms.M / ${h};
    let row = (index1 % stride1) * ${h};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${z.offsetToIndices("batch")};`}

    var a_indices: ${P.type.indices};
    ${ca("a_indices",P,P.rank-2,z.rank,"batch_indices")}
    ${P.indicesSet("a_indices",P.rank-2,0)}
    ${P.indicesSet("a_indices",P.rank-1,0)}
    let a_offset = ${P.indicesToOffset("a_indices")};

    var b_indices: ${B.type.indices};
    ${ca("b_indices",B,B.rank-2,z.rank,"batch_indices")}
    ${B.indicesSet("b_indices",B.rank-2,0)}
    ${B.indicesSet("b_indices",B.rank-1,0)}
    let b_offset = ${B.indicesToOffset("b_indices")};
    var values: array<${L.type.value}, ${h}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${f}) {
      ${Ue()}
    }
    for (var i = 0u; i < ${h}u; i++) {
      var value = values[i];
      ${oe}
      ${J}
      let cur_indices = ${L.type.indices}(batch, row + i, col);
      let offset = ${L.indicesToOffset("cur_indices")};
      ${L.setByOffset(`offset / ${p}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${p};${f};${h};${a}`,inputDependencies:y?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:_}),getShaderSource:T}}}),du,pu,wn,bn,cu,$n,fu,Ba,vn=E(()=>{be(),he(),de(),ti(),_n(),gn(),du=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,pu=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,wn=(e,t,r="f32",i,a=!1,n=32,s=!1,o=32)=>{let u=t[1]*e[1],l=t[0]*e[0],d=a?u:n,p=a?n:u,f=d/t[0],h=n/t[1];if(!((a&&f===4&&e[1]===4||!a&&(f===3||f===4))&&d%t[0]===0&&n%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${a} is true, innerElementSize ${f} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${f} must be 3 or 4.
  tileAWidth ${d} must be divisible by workgroupSize[0]${t[0]}. tileInner ${n} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${f}<${r}>, ${d/f}>, ${p}>;
var<workgroup> mm_Bsub: array<array<vec4<${r}>, ${l/e[0]}>, ${n}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${f};
const tileInner = ${n};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${s?"0":"i32(globalId.z)"};
  ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${u};

  let num_tiles = ${s?`${Math.ceil(o/n)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${s?`i32(globalId.z) * ${o}`:"0"};

  var acc: array<vec4<${r}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${h};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${du(a,i)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${h}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${i?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${f===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${pu(a,f)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},bn=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,cu=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",$n=(e,t,r="f32",i,a=!1,n=32,s=!1,o=32,u=!1)=>{let l=e[1]*t[1],d=e[0]*t[0],p=a?l:n,f=a?n:l;if(!(f%t[1]===0&&p%t[0]===0&&n%t[1]===0))throw new Error(`tileAHight ${f} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${p} must be divisible by workgroupSize[0]${t[0]}, tileInner ${n} must be divisible by workgroupSize[1]${t[1]}`);let h=f/t[1],m=p/t[0],y=n/t[1],$=u?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${d};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${f}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${p}; inputCol = inputCol + ${t[0]}) {
          ${bn(a,i)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${n}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${d}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${i?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${r}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${a?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${h};
let tileColA = i32(localId.x) * ${m};
let tileRowB = i32(localId.y) * ${y};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${h}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${m}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${bn(a,i)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${y}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${i?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${r}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${cu(a)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${r}, ${p}>, ${f}>;
  var<workgroup> mm_Bsub : array<array<${r}, ${d}>, ${n}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${n};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${s?"0":"i32(globalId.z)"};
    ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${s?`${Math.ceil(o/n)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${s?`i32(globalId.z) * ${o}`:"0"};

    var acc : array<array<${r}, colPerThread>, rowPerThread>;
    ${$}
  }
`},fu=(e,t,r,i,a=!1)=>{let[n,s,o,u]=i,l=R(i[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${mt(e,l)} {
      var value = ${mt(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${s.type.indices};
        ${ca("aIndices",s,s.rank-2,n.rank,"batchIndices")}
        ${s.indicesSet("aIndices",s.rank-2,"u32(row)")}
        ${s.indicesSet("aIndices",s.rank-1,"u32(colIn)")}
        value = ${s.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${mt(e,l)} {
      var value = ${mt(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${o.type.indices};
        ${ca("bIndices",o,o.rank-2,n.rank,"batchIndices")}
        ${o.indicesSet("bIndices",o.rank-2,"u32(row)")}
        ${o.indicesSet("bIndices",o.rank-1,"u32(colIn)")}
        value = ${o.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${mt(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${a?"bias[colIn]":`${mt(e,l)}(bias[row])`};`:""}
        ${r}
        ${u.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Ba=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s.slice(0,-2),l=o.slice(0,-2),d=i?i.slice(0,-2):r.slice(0,-2),p=N.size(d),f=s[s.length-2],h=s[s.length-1],m=o[o.length-1],y=h%4===0&&m%4===0,$=f<=8?[4,1,1]:[4,4,1],w=[8,8,1],_=[Math.ceil(m/w[0]/$[0]),Math.ceil(f/w[1]/$[1]),Math.ceil(p/w[2]/$[2])],T=y?4:1,x=[...u,f,h/T],z=x.length,P=[...l,h,m/T],B=P.length,L=[p,f,m/T],V=[{type:6,data:f},{type:6,data:m},{type:6,data:h}];Jr(t,V),V.push(...k(d,x,P));let J=["rank","rank"],we=e.length>2;we&&(V.push(...k(e[2].dims)),J.push("rank")),V.push(...k(L));let oe=ye=>{let Ue=d.length,Ae=ze("batchDims",e[0].dataType,Ue,1),me=R(e[0].dataType),Oe=A("a",e[0].dataType,z,T),pe=A("b",e[1].dataType,B,T),Te=Z("result",e[0].dataType,L.length,T),_t=[Oe,pe];if(we){let Ut=a?T:1;_t.push(A("bias",e[2].dataType,e[2].dims.length,Ut))}let G=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];ei(t,G);let te=R(Te.type.tensor),ge=Yr(t,Te.type.value,te),Re=fu(T,we,ge,[Ae,Oe,pe,Te],a);return`
  ${ye.registerUniforms(G).registerInternalVariables(Ae).declareVariables(..._t,Te)}
  ${Re}
  ${y?wn($,w,me,Ae):$n($,w,me,Ae)}
                   `};return{name:"MatMul",shaderCache:{hint:`${$};${t.activation};${y};${a}`,inputDependencies:J},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:_[0],y:_[1],z:_[2]},programUniforms:V}),getShaderSource:oe}}}),hu,mu,Rc=E(()=>{be(),Dt(),de(),ti(),gn(),Oc(),vn(),hu=(e,t,r,i,a=!1,n,s=4,o=4,u=4,l="f32")=>{let d=V=>{switch(V){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${V} is not supported.`)}},p=V=>{switch(V){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${V} is not supported.`)}},f=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,h=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,m=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",y=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",$=e?"row":"col",w=e?"col":"row",_=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${$} / outWidth;
    let outCol = ${$} % outWidth;

    let WRow = ${w} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${w} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${w} % inChannels;
    var resData = ${mt(s,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${m} && xCol >= 0 && xCol < ${y}) {
      ${f}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${d(s)}
    }
    return resData;`,T=e?t&&i?`
    let col = colIn * ${s};
    ${_}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${_}
    }
    return ${mt(s,l)}(0.0);`:i&&r?`
    let col = colIn * ${s};
    ${_}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${_}
    }
    return ${mt(s,l)}(0.0);`,x=e?i&&r?p(o):`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${p(o)}
    }
    return ${mt(o,l)}(0.0);`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${p(o)}
    }
    return ${mt(o,l)}(0.0);`,z=mt(u,l),P=mt(e?s:o,l),B=mt(e?o:s,l),L=Yr(n,z,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${P} {
      ${e?T:x}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${B} {
      ${e?x:T}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${z}) {
      let col = colIn * ${u};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${h}
      ${uu(a)}
      ${L}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},mu=(e,t,r,i,a,n,s,o,u)=>{let l=t.format==="NHWC",d=l?e[0].dims[3]:e[0].dims[1],p=r[0],f=l?r[2]:r[3],h=l?r[1]:r[2],m=l?r[3]:r[1],y=l&&(d%4===0||d%3===0)&&m%4===0,$=l?m:f*h,w=l?f*h:m,_=[8,8,1],T=i<=8?[4,1,1]:[4,4,1],x=[Math.ceil($/_[0]/T[0]),Math.ceil(w/_[1]/T[1]),Math.ceil(p/_[2]/T[2])];Me("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${x}`);let z=y?l&&d%4!==0?3:4:1,P=_[1]*T[1],B=_[0]*T[0],L=Math.max(_[0]*z,_[1]),V=i%P===0,J=a%B===0,we=n%L===0,oe=y?[z,4,4]:[1,1,1],ye=[{type:6,data:i},{type:6,data:a},{type:6,data:n},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Jr(t,ye),ye.push(...k(e[0].dims,e[1].dims));let Ue=["rank","rank"];s&&(ye.push(...k(e[2].dims)),Ue.push("rank")),ye.push(...k(r));let Ae=me=>{let Oe=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];ei(t,Oe);let pe=y?4:1,Te=R(e[0].dataType),_t=`
      fn setOutputAtIndex(flatIndex : i32, value : ${y?`vec4<${Te}>`:Te}) {
        result[flatIndex] = ${y?`vec4<${Te}>`:Te}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${y?`vec4<${Te}>`:Te}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${y?"/ 4":""}, value);
      }`,G=A("x",e[0].dataType,e[0].dims.length,z===3?1:z),te=A("w",e[1].dataType,e[1].dims.length,pe),ge=[G,te],Re=Z("result",e[0].dataType,r.length,pe);if(s){let Ut=A("bias",e[2].dataType,e[2].dims.length,pe);ge.push(Ut),_t+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${y?`vec4<${Te}>`:Te} {
          return bias[coords.${l?"w":"y"}${y?"/ 4":""}];
        }`}return`
        ${lu("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${me.registerUniforms(Oe).declareVariables(...ge,Re)}
        ${_t}
        ${hu(l,V,J,we,s,t,oe[0],oe[1],oe[2],Te)}
        ${y?wn(T,_,Te,void 0,!l,L):$n(T,_,Te,void 0,!l,L,!1,void 0,o)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${z};${y};${V};${J};${we};${P};${B};${L}`,inputDependencies:Ue},getRunData:()=>({outputs:[{dims:u?u(r):r,dataType:e[0].dataType}],dispatchGroup:{x:x[0],y:x[1],z:x[2]},programUniforms:ye}),getShaderSource:Ae}}}),gu,xn,fa,yu,Sn,_u,wu,bu,Mc=E(()=>{be(),Dt(),he(),de(),ti(),gn(),gu=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},xn=e=>typeof e=="number"?[e,e,e]:e,fa=(e,t)=>t<=1?e:e+(e-1)*(t-1),yu=(e,t,r,i=1)=>{let a=fa(t,i);return Math.floor((e[0]*(r-1)-r+a)/2)},Sn=(e,t,r,i,a)=>{a==null&&(a=yu(e,t[0],i[0]));let n=[0,0,0,r];for(let s=0;s<3;s++)e[s]+2*a>=t[s]&&(n[s]=Math.trunc((e[s]-t[s]+2*a)/i[s]+1));return n},_u=(e,t,r,i,a,n,s,o,u,l)=>{let d,p,f,h;if(e==="VALID"&&(e=0),typeof e=="number"){d={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=Sn([t,r,i,1],[o,u,l],1,[a,n,s],e);p=m[0],f=m[1],h=m[2]}else if(Array.isArray(e)){if(!e.every((y,$,w)=>y===w[0]))throw Error(`Unsupported padding parameter: ${e}`);d={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=Sn([t,r,i,1],[o,u,l],1,[a,n,s],e[0]);p=m[0],f=m[1],h=m[2]}else if(e==="SAME_UPPER"){p=Math.ceil(t/a),f=Math.ceil(r/n),h=Math.ceil(i/s);let m=(p-1)*a+o-t,y=(f-1)*n+u-r,$=(h-1)*s+l-i,w=Math.floor(m/2),_=m-w,T=Math.floor(y/2),x=y-T,z=Math.floor($/2),P=$-z;d={top:T,bottom:x,left:z,right:P,front:w,back:_}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:d,outDepth:p,outHeight:f,outWidth:h}},wu=(e,t,r,i,a,n=!1,s="channelsLast")=>{let o,u,l,d,p;if(s==="channelsLast")[o,u,l,d,p]=e;else if(s==="channelsFirst")[o,p,u,l,d]=e;else throw new Error(`Unknown dataFormat ${s}`);let[f,,h,m,y]=t,[$,w,_]=xn(r),[T,x,z]=xn(i),P=fa(h,T),B=fa(m,x),L=fa(y,z),{padInfo:V,outDepth:J,outHeight:we,outWidth:oe}=_u(a,u,l,d,$,w,_,P,B,L),ye=n?f*p:f,Ue=[0,0,0,0,0];return s==="channelsFirst"?Ue=[o,ye,J,we,oe]:s==="channelsLast"&&(Ue=[o,J,we,oe,ye]),{batchSize:o,dataFormat:s,inDepth:u,inHeight:l,inWidth:d,inChannels:p,outDepth:J,outHeight:we,outWidth:oe,outChannels:ye,padInfo:V,strideDepth:$,strideHeight:w,strideWidth:_,filterDepth:h,filterHeight:m,filterWidth:y,effectiveFilterDepth:P,effectiveFilterHeight:B,effectiveFilterWidth:L,dilationDepth:T,dilationHeight:x,dilationWidth:z,inShape:e,outShape:Ue,filterShape:t}},bu=(e,t,r,i,a,n)=>{let s=n==="channelsLast";s?e[0].dims[3]:e[0].dims[1];let o=[64,1,1],u={x:r.map(($,w)=>w)},l=[Math.ceil(gu(u.x.map($=>r[$]))/o[0]),1,1];Me("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let d=1,p=N.size(r),f=[{type:12,data:p},{type:12,data:i},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];Jr(t,f),f.push(...k(e[0].dims,e[1].dims));let h=["rank","rank"],m=e.length===3;m&&(f.push(...k(e[2].dims)),h.push("rank")),f.push(...k(r));let y=$=>{let w=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:i.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];ei(t,w);let _=1,T=R(e[0].dataType),x=A("x",e[0].dataType,e[0].dims.length,d),z=A("W",e[1].dataType,e[1].dims.length,_),P=[x,z],B=Z("result",e[0].dataType,r.length,_),L="";if(m){let we=A("bias",e[2].dataType,e[2].dims.length,_);P.push(we),L+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${T} {
          return bias[${s?U("coords",4,5):U("coords",1,5)}];
        }`}let V=mt(d,T),J=Yr(t,V,T);return`
            ${L}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${x.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${z.getByIndices("aIndices")};
            }
          ${$.registerUniforms(w).declareVariables(...P,B)}
          ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${B.offsetToIndices("global_idx")};
              let batch = ${U("coords",0,x.rank)};
              let d2 = ${s?U("coords",x.rank-1,x.rank):U("coords",1,x.rank)};
              let xFRCCorner = vec3<u32>(${s?U("coords",1,x.rank):U("coords",2,x.rank)},
              ${s?U("coords",2,x.rank):U("coords",3,x.rank)},
              ${s?U("coords",3,x.rank):U("coords",4,x.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?U("uniforms.x_shape",1,x.rank):U("uniforms.x_shape",2,x.rank)};
              let xShapeZ = ${s?U("uniforms.x_shape",2,x.rank):U("uniforms.x_shape",3,x.rank)};
              let xShapeW = ${s?U("uniforms.x_shape",3,x.rank):U("uniforms.x_shape",4,x.rank)};
              let xShapeU = ${s?U("uniforms.x_shape",4,x.rank):U("uniforms.x_shape",1,x.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${s?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${s?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${s?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${s?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${m?"value = value + getBiasByOutputCoords(coords)":""};
              ${J}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${d};${m}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:f}),getShaderSource:y}}}),$u,vu,Bc=E(()=>{be(),he(),de(),ti(),$u=(e,t,r,i)=>{let a=e.length>2,n=a?"value += b[output_channel];":"",s=e[0].dims,o=e[1].dims,u=t.format==="NHWC",l=u?r[3]:r[1],d=l/t.group,p=u&&d>=4?M(l):1,f=N.size(r)/p,h=[{type:12,data:f},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:d}];Jr(t,h),h.push(...k(s,[o[0],o[1],o[2],o[3]/p]));let m=a?["rank","rank","rank"]:["rank","rank"];h.push(...k([r[0],r[1],r[2],r[3]/p]));let y=$=>{let w=Z("output",e[0].dataType,r.length,p),_=R(w.type.tensor),T=Yr(t,w.type.value,_),x=A("x",e[0].dataType,s.length),z=A("w",e[1].dataType,o.length,p),P=[x,z];a&&P.push(A("b",e[2].dataType,e[2].dims,p));let B=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];ei(t,B);let L=u?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${x.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${z.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${x.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${z.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${$.registerUniforms(B).declareVariables(...P,w)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${w.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${u?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${u?1:2}], outputIndices[${u?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${p} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${u?2:1}];

    var value: ${w.type.value} = ${w.type.value}(0);
    ${L}
    ${n}
    ${T}
    ${w.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:h}),getShaderSource:y}},vu=(e,t,r,i)=>{let a=e.length>2,n=M(r[3]),s=M(r[2]),o=N.size(r)/n/s,u=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/n],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/n],d=[r[0],r[1],r[2],r[3]/n],p=[{type:12,data:o},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Jr(t,p),p.push(...k(u,l,d));let f=(s-1)*t.strides[1]+l[1],h=m=>{let y=Z("output",e[0].dataType,d.length,n),$=R(y.type.tensor),w=Yr(t,y.type.value,$),_=A("x",e[0].dataType,u.length,n),T=A("w",e[1].dataType,l.length,n),x=[_,T];a&&x.push(A("b",e[2].dataType,e[2].dims,n));let z=a?"value += b[output_channel];":"",P=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return ei(t,P),`
  ${m.registerUniforms(P).declareVariables(...x,y)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${s}u;
    let col = (index1 % width1) * ${s}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${_.type.value}, ${f}>;
    var values: array<${y.type.value}, ${s}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${f}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${_.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${_.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${T.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${s}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${s}u; i++) {
      var value = values[i];
      ${z}
      ${w}
      ${y.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${n};${s};${f};${l[0]};${l[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:p}),getShaderSource:h}}}),xu,Da,Su,Pa,Tn,En,Tu,Eu,In,Dc=E(()=>{he(),Rc(),Mc(),vn(),Bc(),ti(),_n(),ht(),xu=(e,t,r,i,a,n)=>{let s=e[0],o=e.slice(n?1:2,n?3:4),u=o.length,l=t[0],d=t.slice(2).map((f,h)=>f+(f-1)*(r[h]-1)),p=o.map((f,h)=>f+i[h]+i[h+u]).map((f,h)=>Math.floor((f-d[h]+a[h])/a[h]));return p.splice(0,0,s),p.splice(n?3:1,0,l),p},Da=[2,3,1,0],Su=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[1]*t.group;if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Pa=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let n=2;n<t[1].dims.length;++n)r[n-2]===0&&(r[n-2]=t[1].dims[n]);let i=e.pads.slice();gr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,i,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:i}),a},Tn=e=>{let t=mn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,n=e.group,s=e.kernel_shape,o=e.pads,u=e.strides,l=e.w_is_const();return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},En=(e,t,r,i)=>{let a=r.format==="NHWC",n=xu(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let P=[t[0]];if(a){let B=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=B),P.push(B)}else P.push(t[1]);t.length===3&&P.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(vu(P,r,n,i),{inputs:P}):e.compute($u(P,r,n,i),{inputs:P});return}let s=t.length===3,o=t[0].dims[a?1:2],u=t[0].dims[a?2:3],l=t[0].dims[a?3:1],d=t[1].dims[2],p=t[1].dims[3],f=n[a?1:2],h=n[a?2:3],m=n[a?3:1],y=a&&d===o&&p===u&&r.pads[0]===0&&r.pads[1]===0;if(y||d===1&&p===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let P=n[0],B,L,V,J=[];if(a){let ye=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=ye),y){let Ue=o*u*l;B=t[0].reshape([1,P,Ue]),L=ye.reshape([1,Ue,m]),V=[1,P,m]}else B=t[0].reshape([P,o*u,l]),L=ye.reshape([1,l,m]),V=[P,f*h,m];J.push(B),J.push(L)}else B=t[0].reshape([P,l,o*u]),L=t[1].reshape([1,m,l]),V=[P,m,f*h],J.push(L),J.push(B);s&&J.push(t[2]);let we=V[2],oe=J[0].dims[J[0].dims.length-1];we<8&&oe<8?e.compute(yn(J,r,n,V,a,i),{inputs:J}):e.compute(Ba(J,r,n,V,a,i),{inputs:J});return}let $=!0,w=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=w);let _=[t[0],w];s&&_.push(t[2]);let T=a?f*h:m,x=a?m:f*h,z=d*p*l;e.compute(mu(_,r,n,T,x,z,s,$,i),{inputs:_})},Tu=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],n=[1].concat(t.strides),s=[1].concat(t.dilations),o=[1].concat(t.kernelShape),u=Pa({...t,pads:a,strides:n,dilations:s,kernelShape:o},i);En(e,i,u,l=>r?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},Eu=(e,t,r)=>{let i=r.format==="NHWC"?"channelsLast":"channelsFirst",a=Pa(r,t),n=r.autoPad==="NOTSET"?r.pads:r.autoPad,s=wu(t[0].dims,t[1].dims,r.strides,r.dilations,n,!1,i);e.compute(bu(t,a,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],i))},In=(e,t)=>{if(Su(e.inputs,t),e.inputs[0].dims.length===3)Tu(e,t);else if(e.inputs[0].dims.length===5)Eu(e,e.inputs,t);else{let r=Pa(t,e.inputs);En(e,e.inputs,r)}}}),Iu,Pc=E(()=>{be(),Dt(),he(),de(),Iu=(e,t,r)=>{let i=e.length>2,a=t.outputShape,n=t.format==="NHWC",s=t.group,o=e[1].dims,u=o[2]/s,l=o[3],d=n?M(u):1,p=n&&l===1&&u>=4,f=p?Math.floor(u/4)*4:Math.floor(u/d)*d,h=u-f,m=n?M(l):1,y=n?l===1?d:m:1,$=N.size(a)/m,w=[Math.ceil($/64),1,1];Me("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${w}`);let _=["rank","rank"],T=[t.strides[0],t.strides[1]],x=[t.kernelShape[n?1:2],t.kernelShape[n?2:3]],z=[t.dilations[0],t.dilations[1]],P=[x[0]+(t.dilations[0]<=1?0:(t.kernelShape[n?1:2]-1)*(t.dilations[0]-1)),x[1]+(t.dilations[1]<=1?0:(t.kernelShape[n?2:3]-1)*(t.dilations[1]-1))],B=[P[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),P[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],L=[{type:12,data:$},{type:12,data:T},{type:12,data:x},{type:12,data:z},{type:12,data:P},{type:6,data:B},{type:12,data:f},{type:12,data:u},{type:12,data:l},...k(e[0].dims,e[1].dims)];i&&(L.push(...k(e[2].dims)),_.push("rank")),L.push(...k(a));let V=J=>{let we=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:T.length},{name:"filter_dims",type:"u32",length:x.length},{name:"dilations",type:"u32",length:x.length},{name:"effective_filter_dims",type:"u32",length:P.length},{name:"pads",type:"i32",length:B.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],oe=R(e[0].dataType),ye=n?1:2,Ue=n?2:3,Ae=n?3:1,me=A("W",e[1].dataType,e[1].dims.length,y),Oe=A("Dy",e[0].dataType,e[0].dims.length,d),pe=[Oe,me];i&&pe.push(A("bias",e[2].dataType,[a[Ae]].length,m));let Te=Z("result",e[0].dataType,a.length,m),_t=()=>{let ge="";if(p)d===4?ge+=`
        let xValue = ${Oe.getByOffset("x_offset")};
        let wValue = ${me.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:d===2?ge+=`
          dotProd = dotProd + dot(vec4<${oe}>(${Oe.getByOffset("x_offset")}, ${Oe.getByOffset("x_offset + 1u")}), vec4<${oe}>(${me.getByOffset("w_offset")}, ${me.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:d===1&&(ge+=`
          dotProd = dotProd + dot(vec4<${oe}>(${Oe.getByOffset("x_offset")}, ${Oe.getByOffset("x_offset + 1u")}, ${Oe.getByOffset("x_offset + 2u")}, ${Oe.getByOffset("x_offset + 3u")}), vec4<${oe}>(${me.getByOffset("w_offset")}, ${me.getByOffset("w_offset + 1u")}, ${me.getByOffset("w_offset + 2u")}, ${me.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(ge+=`
                  let xValue = ${n?Oe.getByOffset(`${Oe.indicesToOffset(`${Oe.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d}`):Oe.get("batch","inputChannel","idyR","idyC")};
        `,d===1)ge+=`
          let w_offset = ${me.indicesToOffset(`${me.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${me.getByOffset(`w_offset / ${y}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let Re=0;Re<d;Re++)ge+=`
            let wValue${Re} = ${me.getByOffset(`${me.indicesToOffset(`${me.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${Re}, wOutChannel)`)} / ${y}`)};
            dotProd = dotProd + xValue[${Re}] * wValue${Re};`;return ge},G=()=>{if(h===0)return"";if(!p)throw new Error(`packInputAs4 ${p} is not true.`);let ge="";if(d===1){ge+="dotProd = dotProd";for(let Re=0;Re<h;Re++)ge+=`
            + ${Oe.getByOffset(`x_offset + ${Re}`)} * ${me.getByOffset(`w_offset + ${Re}`)}`;ge+=";"}else if(d===2){if(h!==2)throw new Error(`Invalid inputChannelsRemainder ${h}.`);ge+=`
          let xValue = ${Oe.getByOffset("x_offset")};
          let wValue = ${me.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return ge},te=`
            let outputIndices = ${Te.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${Te.indicesGet("outputIndices",0)};
            let d1 = ${Te.indicesGet("outputIndices",Ae)};
            let r = ${Te.indicesGet("outputIndices",ye)};
            let c = ${Te.indicesGet("outputIndices",Ue)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${Te.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${oe}(dyRCorner) + ${oe}(wR)) / ${oe}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${oe}(uniforms.Dy_shape[${ye}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${oe}(dyCCorner) + ${oe}(wC)) / ${oe}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${oe}(uniforms.Dy_shape[${Ue}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${p?`
                var x_offset = ${Oe.indicesToOffset(`${Oe.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d};
                var w_offset = ${me.indicesToOffset(`${me.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${y};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${p?4:d}) {
                  ${_t()}
                  inputChannel = inputChannel + ${p?4:d};
                }
                ${G()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${i?` + bias[d1 / ${m}]`:""};
            ${Te.setByOffset("global_idx","value")};
          `;return`
    ${J.registerUniforms(we).declareVariables(...pe,Te)}
      ${J.mainStart()}
      ${J.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${te}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${d}${y}${m}${p}${h}`,inputDependencies:_},getRunData:()=>({dispatchGroup:{x:w[0],y:w[1],z:w[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:L}),getShaderSource:V}}}),ku,Cu,zu,kn,Au,Ou,Cn,Ru,Mu,Uc=E(()=>{Pc(),ti(),ht(),ku=(e,t,r,i,a,n)=>(e-1)*t+r+(i-1)*a+1-n,Cu=(e,t,r,i,a)=>{let n=Math.floor(e/2);t==="SAME_UPPER"?(r[i]=n,r[a]=e-n):t==="SAME_LOWER"&&(r[i]=e-n,r[a]=n)},zu=(e,t,r,i,a,n,s,o,u,l)=>{let d=e.length-2,p=l.length===0;u.length<d&&u.push(...Array(d-u.length).fill(0));let f=e[0],h=t[o?3:1]*a;for(let m=0,y=e.length-d-(o?1:0);m<d;++m,++y){let $=e[y],w=p?$*s[m]:l[m],_=ku($,s[m],n[m],t[y],r[m],w);Cu(_,i,n,m,m+d),p&&l.push(s[m]*($-1)+u[m]+(t[y]-1)*r[m]+1-n[m]-n[m+d])}l.splice(0,0,f),l.splice(o?3:1,0,h)},kn=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((p,f)=>p*f,1)===0){r.length=0;for(let p=2;p<t[1].dims.length;++p)r.push(t[1].dims[p])}let i=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(i?3:1,0,t[1].dims[1]);let a=e.pads.slice(),n=e.outputShape.slice(),s=e.outputPadding.slice(),o=t[0].dims,u=e.dilations.slice();if(u.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;u=new Array(p).fill(1)}let l=e.strides.slice();if(l.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;l=new Array(p).fill(1)}zu(o,r,u,e.autoPad,e.group,a,l,i,s,n);let d=Object.assign({},e);return Object.assign(d,{kernelShape:r,pads:a,outputPadding:s,outputShape:n,dilations:u,strides:l}),d},Au=e=>{let t=mn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,n=e.group,s=e.kernelShape,o=e.pads,u=e.strides,l=e.wIsConst(),d=e.outputPadding,p=e.outputShape;return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,outputPadding:d,outputShape:p,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Ou=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[0];if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let n=e[0].dims.length-2;if(t.dilations.reduce((s,o)=>s+o,0)>0&&t.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(t.strides.reduce((s,o)=>s+o,0)>0&&t.strides.length!==n)throw new Error(`strides should be ${n}D`);if(t.pads.reduce((s,o)=>s+o,0)>0&&t.pads.length!==n*2)throw new Error(`pads should be ${n*2}D`);if(t.outputPadding.length!==n&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${n}D`);if(t.kernelShape.reduce((s,o)=>s+o,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Cn=(e,t,r,i)=>{let a=e.kernelCustomData.wT??e.compute(bt(t[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=a);let n=[t[0],a];t.length===3&&n.push(t[2]),e.compute(Iu(n,r,i),{inputs:n})},Ru=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let n=t.dilations;(n.length===0||n[0]===0)&&(n=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let o=t.pads;o.length===0&&(o=[0,0]),o=[0,o[0],0,o[1]],s=[1].concat(s),n=[1].concat(n),a=[1].concat(a);let u=t.outputPadding;u=[0].concat(u);let l=kn({...t,pads:o,strides:s,dilations:n,kernelShape:a,outputPadding:u},i);Cn(e,i,l,d=>r?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Mu=(e,t)=>{if(Ou(e.inputs,t),e.inputs[0].dims.length===3)Ru(e,t);else{let r=kn(t,e.inputs);Cn(e,e.inputs,r)}}}),Bu,Du,Pu,Nc=E(()=>{be(),he(),b(),de(),Bu=(e,t,r,i)=>{let a=N.size(t),n=t.length,s=A("input",e,n),o=Z("output",e,n),u=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),l=N.normalizeAxis(u,n),d=p=>{let f=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,h=U("uniforms.input_shape","uniforms.axis",n),m=i.reverse?f+(i.exclusive?" + 1":""):"0",y=i.reverse?h:f+(i.exclusive?"":" + 1");return`
                ${p.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(s,o)}
                ${p.mainStart()}
                  ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${o.offsetToIndices("global_idx")};
                  var sum = ${o.type.value}(0);
                  let first : i32 = ${m};
                  let last : i32 = ${y};
                  for (var i : i32 = first; i < last; i++) {
                    ${s.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${s.getByIndices("inputIndices")};
                  }
                  ${o.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:i.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:l},...k(t,t)]}),getShaderSource:d}},Du=(e,t)=>{let r=e.inputs[0].dims,i=e.inputs[0].dataType,a=e.inputs[1];e.compute(Bu(i,r,a,t),{inputs:[0]})},Pu=e=>{let t=e.exclusive===1,r=e.reverse===1;return g({exclusive:t,reverse:r})}}),Uu,Nu,Lu,qu,Vu,Lc=E(()=>{be(),he(),b(),de(),Uu=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},Nu=(e,t,r,i)=>{let a=[];a.push(`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let n=0;n<t;++n)a.push(r.indicesSet("a",e[n],`i[${n}]`));return a.push("return a;}"),a.join(`
`)},Lu=(e,t)=>{let r,i,a,n,s,o,u=t.format==="NHWC",l=t.blocksize,d=t.mode==="DCR";u?([r,i,a,n]=e.dims,s=d?[r,i,a,l,l,n/l**2]:[r,i,a,n/l**2,l,l],o=d?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,i,a,n]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=d?[r,l,l,n/l**2,i,a]:[r,n/l**2,l,l,i,a],o=d?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let p=e.reshape(s),f=p.dims.length,h=e.dataType,m=A("a",h,f),y=Z("output",h,f),$=w=>`
  ${w.registerUniform("output_size","u32").declareVariables(m,y)}

  ${Nu(o,f,m,y)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${y.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${y.setByOffset("global_idx",m.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:w=>{let _=u?[r,i*l,a*l,n/l**2]:[r,n/l**2,i*l,a*l],T=N.size(_),x=p.dims,z=N.sortBasedOnPerm(x,o);return{outputs:[{dims:_,dataType:w[0].dataType}],dispatchGroup:{x:Math.ceil(T/64)},programUniforms:[{type:12,data:T},...k(x,z)]}},getShaderSource:$}},qu=(e,t)=>{Uu(e.inputs),e.compute(Lu(e.inputs[0],t))},Vu=e=>g({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Ua,ha,zn,Fu,Wu,Gu,ju,An,Hu,Ku,Zu,qc=E(()=>{be(),he(),b(),de(),Ua="[a-zA-Z]|\\.\\.\\.",ha="("+Ua+")+",zn="^"+ha+"$",Fu="("+ha+",)*"+ha,Wu="^"+Fu+"$",Gu=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},ju=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,i]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(Wu)))throw new Error("Invalid LHS term");if(r.split(",").forEach((n,s)=>{let o=e[s].dims.slice();if(!n.match(RegExp(zn)))throw new Error("Invalid LHS term");let u=this.processTerm(n,!0,o,s);this.lhs.push(u)}),i==="")i+=[...this.symbolToInfo.entries()].filter(([n,s])=>s.count===1||n==="...").map(([n])=>n).join("");else if(!i.match(RegExp(ha)))throw new Error("Invalid RHS");(a=i.match(RegExp(Ua,"g")))==null||a.forEach(n=>{if(n==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let s=this.symbolToInfo.get(n);if(s===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(s.dimValue)}}),this.rhs=this.processTerm(i,!1,this.outputDims)}addSymbol(e,t,r){let i=this.symbolToInfo.get(e);if(i!==void 0){if(i.dimValue!==t&&i.count!==1)throw new Error("Dimension mismatch");i.count++,i.inputIndices.push(r)}else i={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,i)}processTerm(e,t,r,i=-1){let a=r.length,n=!1,s=[],o=0;if(!e.match(RegExp(zn))&&!t&&e!=="")throw new Error("Invalid LHS term");let u=e.match(RegExp(Ua,"g")),l=new Gu(i);return u==null||u.forEach((d,p)=>{if(d==="..."){if(n)throw new Error("Only one ellipsis is allowed per input term");n=!0;let f=a-u.length+1;if(f<0)throw new Error("Ellipsis out of bounds");if(s=r.slice(o,o+f),this.hasEllipsis){if(this.ellipsisDims.length!==s.length||this.ellipsisDims.toString()!==s.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=s;else throw new Error("Ellipsis must be specified in the LHS");for(let h=0;h<s.length;h++){let m=String.fromCharCode(48+h);l.addSymbol(m,p+h),this.addSymbol(m,r[o++],i)}}else l.addSymbol(d,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(d,r[o++],i)}),l}},An=e=>e+"_max",Hu=(e,t,r,i)=>{let a=e.map(l=>l.length).map((l,d)=>A(`input${d}`,t,l)),n=N.size(i),s=Z("output",t,i.length),o=[...r.symbolToInfo.keys()].filter(l=>!r.rhs.symbolToIndices.has(l)),u=l=>{let d=[],p="var prod = 1.0;",f="var sum = 0.0;",h="sum += prod;",m=[],y=[],$=[],w=[],_=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((x,z)=>{var P;if(r.rhs.symbolToIndices.has(z)){let B=(P=r.rhs.symbolToIndices.get(z))==null?void 0:P[0];B!==void 0&&r.lhs.forEach((L,V)=>{if(x.inputIndices.includes(V)){let J=L.symbolToIndices.get(z);if(J===void 0)throw new Error("Invalid symbol error");J.forEach(we=>{d.push(`${a[V].indicesSet(`input${V}Indices`,we,s.indicesGet("outputIndices",B))}`)})}})}else r.lhs.forEach((B,L)=>{if(x.inputIndices.includes(L)){let V=B.symbolToIndices.get(z);if(V===void 0)throw new Error("Invalid symbol error");V.forEach(J=>{m.push(`${a[L].indicesSet(`input${L}Indices`,J,`${z}`)}`)}),w.push(`prod *= ${a[L].getByIndices(`input${L}Indices`)};`)}}),y.push(`for(var ${z}: u32 = 0; ${z} < uniforms.${An(z)}; ${z}++) {`),$.push("}")});let T=_?[...d,`let sum = ${a.map((x,z)=>x.getByIndices(`input${z}Indices`)).join(" * ")};`]:[...d,f,...y,...m,p,...w,h,...$];return`
            ${l.registerUniforms(o.map(x=>({name:`${An(x)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,s)}

            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${s.offsetToIndices("global_idx")};
            ${a.map((x,z)=>`var input${z}Indices: ${a[z].type.indices};`).join(`
`)}
            ${T.join(`
`)};
            ${s.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let l=o.filter(p=>r.symbolToInfo.has(p)).map(p=>{var f;return{type:12,data:((f=r.symbolToInfo.get(p))==null?void 0:f.dimValue)||0}});l.push({type:12,data:n});let d=e.map((p,f)=>[...k(p)]).reduce((p,f)=>p.concat(f),l);return d.push(...k(i)),{outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:d}},getShaderSource:u}},Ku=(e,t)=>{let r=new ju(e.inputs,t.equation),i=r.outputDims,a=e.inputs.map((n,s)=>n.dims);e.compute(Hu(a,e.inputs[0].dataType,r,i))},Zu=e=>{let t=e.equation.replace(/\s+/g,"");return g({equation:t})}}),Qu,On,Xu,Yu,Ju,Vc=E(()=>{be(),he(),de(),Qu=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;i<r.length&&a<t.length;++i,++a)if(r[i]!==t[a]&&r[i]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},On=(e,t)=>{let r=e.length-t.length,i=[];for(let a=0;a<r;++a)i.push(e[a]);for(let a=0;a<t.length;++a)i.push(t[a]===1?e[a+r]:t[a]);return i},Xu=(e,t)=>e.length>t.length?On(e,t):On(t,e),Yu=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=Xu(t,r),a=e[0].dataType,n=a===9||N.size(t)===1,s=a===9||t.length>0&&t[t.length-1]%4===0?4:1,o=n||i.length>0&&i[i.length-1]%4===0?4:1,u=Math.ceil(N.size(i)/o),l=p=>{let f=A("input",a,t.length,s),h=Z("output",a,i.length,o),m;if(a===9){let y=($,w,_="")=>`
          let outputIndices${w} = ${h.offsetToIndices(`outputOffset + ${w}u`)};
          let offset${w} = ${f.broadcastedIndicesToOffset(`outputIndices${w}`,h)};
          let index${w} = offset${w} / 4u;
          let component${w} = offset${w} % 4u;
          ${$}[${w}] = ${_}(${f.getByOffset(`index${w}`)}[component${w}]);
        `;m=`
        let outputOffset = global_idx * ${o};
        var data = vec4<u32>(0);
        ${y("data",0,"u32")}
        ${y("data",1,"u32")}
        ${y("data",2,"u32")}
        ${y("data",3,"u32")}
        ${h.setByOffset("global_idx","data")}
      }`}else m=`
        let outputIndices = ${h.offsetToIndices(`global_idx * ${o}`)};
        let inputOffset = ${f.broadcastedIndicesToOffset("outputIndices",h)};
        let data = ${h.type.value}(${f.getByOffset(`inputOffset / ${s}`)});
        ${h.setByOffset("global_idx","data")}
      }`;return`
    ${p.registerUniform("vec_size","u32").declareVariables(f,h)}
    ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${m}`},d=[{type:12,data:u},...k(t,i)];return{name:"Expand",shaderCache:{hint:`${i.length};${s}${o}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d})}},Ju=e=>{Qu(e.inputs),e.compute(Yu(e.inputs),{inputs:[0]})}}),el,tl,Fc=E(()=>{be(),he(),de(),hn(),el=e=>{let t=e[0].dataType,r=N.size(e[0].dims),i=N.size(e[1].dims),a=i%4===0,n=s=>{let o=A("x",t,[1],4),u=A("bias",t,[1],4),l=Z("y",t,[1],4),d=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],p=h=>`
      let bias${h}_offset: u32 = (global_idx * 4 + ${h}) % uniforms.bias_size;
      let bias${h} = ${u.getByOffset(`bias${h}_offset / 4`)}[bias${h}_offset % 4];`,f=a?`
      let bias = ${u.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${p(0)}${p(1)}${p(2)}${p(3)}
      let bias = ${o.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(d).declareVariables(o,u,l)}

    ${cn(C(t))}

    ${s.mainStart(I)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${o.getByOffset("global_idx")};
      ${f}
      let x_in = x + bias;
      ${l.setByOffset("global_idx",fn("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:n,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:i}],dispatchGroup:{x:Math.ceil(r/I/4)}})}},tl=e=>{e.inputs.length<2||N.size(e.inputs[1].dims)===0?Bo(e):e.compute(el(e.inputs))}}),rl,il,al,nl,Wc=E(()=>{be(),he(),b(),de(),rl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},il=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=N.normalizeAxis(t.axis,a),s=r.slice(0);s.splice(n,1,...i);let o=r[n],u=e[0].dataType===9?4:1,l=Math.ceil(N.size(s)/u),d=[{type:12,data:l},{type:6,data:o},{type:12,data:n},...k(e[0].dims,e[1].dims,s)],p=f=>{let h=A("data",e[0].dataType,e[0].dims.length,u),m=A("inputIndices",e[1].dataType,e[1].dims.length),y=Z("output",e[0].dataType,s.length,u),$=_=>{let T=i.length,x=`var indicesIndices${_}  = ${m.type.indices}(0);`;for(let z=0;z<T;z++)x+=`${T>1?`indicesIndices${_}[${z}]`:`indicesIndices${_}`} = ${s.length>1?`outputIndices${_}[uniforms.axis + ${z}]`:`outputIndices${_}`};`;x+=`
          var idx${_} = ${m.getByIndices(`indicesIndices${_}`)};
          if (idx${_} < 0) {
            idx${_} = idx${_} + uniforms.axisDimLimit;
          }
          var dataIndices${_} : ${h.type.indices};
        `;for(let z=0,P=0;z<a;z++)z===n?(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = u32(idx${_});`,P+=T):(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = ${s.length>1?`outputIndices${_}[${P}]`:`outputIndices${_}`};`,P++);return x},w;if(e[0].dataType===9){let _=(T,x,z="")=>`
          let outputIndices${x} = ${y.offsetToIndices(`outputOffset + ${x}u`)};
          ${$(x)};
          let offset${x} = ${h.indicesToOffset(`dataIndices${x}`)};
          let index${x} = offset${x} / 4u;
          let component${x} = offset${x} % 4u;
          ${T}[${x}] = ${z}(${h.getByOffset(`index${x}`)}[component${x}]);
        `;w=`
        let outputOffset = global_idx * ${u};
        var value = vec4<u32>(0);
        ${_("value",0,"u32")}
        ${_("value",1,"u32")}
        ${_("value",2,"u32")}
        ${_("value",3,"u32")}
        ${y.setByOffset("global_idx","value")}
      `}else w=`
      let outputIndices = ${y.offsetToIndices("global_idx")};
      ${$("")};
      let value = ${h.getByIndices("dataIndices")};
      ${y.setByOffset("global_idx","value")};
      `;return`
      ${f.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(h,m,y)}
      ${f.mainStart()}
        ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${w}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:p}},al=e=>g({axis:e.axis}),nl=(e,t)=>{let r=e.inputs;rl(r),e.compute(il(e.inputs,t))}}),sl,ol,ul,Gc=E(()=>{be(),he(),de(),sl=(e,t,r,i,a,n,s,o,u)=>{let l=[{type:12,data:n},{type:12,data:i},{type:12,data:a},{type:12,data:r},{type:12,data:s},{type:12,data:o},{type:12,data:u}],d=[n];l.push(...k(t.dims,d));let p=f=>{let h=A("indices_data",t.dataType,t.dims.length),m=Z("input_slice_offsets_data",12,1,1),y=[h,m],$=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:a.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${f.registerUniforms($).declareVariables(...y)}
  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${a.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${r.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${a.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:l}),getShaderSource:p},{inputs:[t],outputs:[-1]})[0]},ol=(e,t)=>{let r=e.inputs,i=r[0].dims,a=r[0].dataType,n=r[1].dims,s=n[n.length-1],o=N.sizeToDimension(n,n.length-1),u=N.sizeFromDimension(i,t.batchDims+s),l=N.sizeToDimension(i,t.batchDims),d=N.sizeFromDimension(i,t.batchDims),p=o/l,f=new Array(s),h=u;for(let x=0;x<s;++x)f[s-1-x]=h,h*=i[t.batchDims+s-1-x];let m=sl(e,r[1],f,t.batchDims,i,o,p,d,s),y=t.batchDims+s;if(y>i.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let $=n.slice(0,-1).concat(i.slice(y)),w=N.size($),_=[{type:12,data:w},{type:12,data:u},...k(r[0].dims,m.dims,$)],T=x=>{let z=A("data",r[0].dataType,r[0].dims.length),P=A("slice_offsets",12,m.dims.length),B=Z("output",r[0].dataType,$.length);return`
          ${x.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(z,P,B)}
            ${x.mainStart()}
            ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:$,dataType:a}],dispatchGroup:{x:Math.ceil(w/64)},programUniforms:_}),getShaderSource:T},{inputs:[r[0],m]})},ul=e=>({batchDims:e.batch_dims,cacheKey:""})}),ll,dl,pl,cl,jc=E(()=>{be(),he(),b(),de(),ll=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=N.normalizeAxis(t.quantizeAxis,e[0].dims.length),i=t.blockSize,a=e[0],n=e[2],s=e.length===4?e[3]:void 0;if(n.dims.length!==a.dims.length||!a.dims.map((o,u)=>u===r?Math.ceil(o/i)===n.dims[u]:o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==n.dims.length||!s.dims.map((o,u)=>o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},dl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=N.normalizeAxis(t.gatherAxis,a),s=N.normalizeAxis(t.quantizeAxis,a),o=r.slice(0);o.splice(n,1,...i);let u=N.size(o),l=e[2].dataType,d=e[0].dataType===22,p=[{type:12,data:u},{type:12,data:s},{type:12,data:n},{type:12,data:t.blockSize},...k(...e.map((h,m)=>h.dims),o)],f=h=>{let m=A("data",e[0].dataType,e[0].dims.length),y=A("inputIndices",e[1].dataType,e[1].dims.length),$=A("scales",e[2].dataType,e[2].dims.length),w=e.length>3?A("zeroPoint",e[3].dataType,e[3].dims.length):void 0,_=Z("output",l,o.length),T=[m,y,$];w&&T.push(w);let x=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${h.registerUniforms(x).declareVariables(...T,_)}
        ${h.mainStart()}
        let output_indices = ${_.offsetToIndices("global_idx")};
        var indices_indices = ${y.type.indices}(0);
        ${i.length>1?`
          for (var i: u32 = 0; i < ${i.length}; i++) {
            let index = ${_.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${y.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${_.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${m.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${_.indicesGet("output_indices","i")};
          ${m.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${y.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${r[n]};
        }
        ${m.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${o.length}; i++) {
          let index = ${_.indicesGet("output_indices",`i + ${i.length} - 1`)};
          ${m.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${m.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${m.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${$.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${$.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${$.getByIndices("scale_indices")};
        ${w?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${w.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${w.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${C(l)}(quantized_data - zero_point) * scale;
        ${_.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((h,m)=>m!==1).map(h=>h.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(h,m)=>"rank")},getRunData:()=>({outputs:[{dims:o,dataType:l}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:f}},pl=(e,t)=>{let r=e.inputs;ll(r,t),e.compute(dl(e.inputs,t))},cl=e=>g({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),fl,hl,ml,gl,Hc=E(()=>{be(),he(),b(),de(),fl=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},hl=(e,t)=>{let r=e[0].dims,i=e[0].dataType,a=r.length,n=e[1].dims,s=e[1].dataType,o=N.normalizeAxis(t.axis,a),u=r[o],l=n.slice(0),d=N.size(l),p=A("input",i,a),f=A("indicesInput",s,n.length),h=Z("output",i,l.length),m=[{type:12,data:d},{type:6,data:u},{type:12,data:o}];return m.push(...k(r,n,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:m}),getShaderSource:y=>`
      ${y.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(p,f,h)}
      ${y.mainStart()}
      ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${h.offsetToIndices("global_idx")};

      var idx = ${f.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${p.type.indices}(outputIndices);
      ${p.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${p.getByIndices("inputIndices")};

      ${h.setByOffset("global_idx","value")};
  }`}},ml=e=>g({axis:e.axis}),gl=(e,t)=>{let r=e.inputs;fl(r),e.compute(hl(e.inputs,t))}}),yl,_l,wl,bl,Kc=E(()=>{be(),he(),de(),yl=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},_l=(e,t)=>{let r=e[0].dims.slice(),i=e[1].dims.slice(),[a,n,s]=gi.getShapeOfGemmResult(r,t.transA,i,t.transB,e.length===3?e[2].dims:void 0),o=[a,n];if(!o)throw new Error("Can't use gemm on the given tensors");let u=16,l=Math.ceil(n/u),d=Math.ceil(a/u),p=!0,f=N.size(o),h=[{type:12,data:p?l:f},{type:12,data:a},{type:12,data:n},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],m=["type","type"];e.length===3&&(h.push(...k(e[2].dims)),m.push("rank")),h.push(...k(o));let y=w=>{let _="";t.transA&&t.transB?_="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?_="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?_="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(_="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let T=t.alpha===1?"":"value *= uniforms.alpha;",x=A("a",e[0].dataType,e[0].dims),z=A("b",e[1].dataType,e[1].dims),P=x.type.value,B=null,L=[x,z];e.length===3&&(B=A("c",e[2].dataType,e[2].dims.length),L.push(B));let V=Z("output",e[0].dataType,o.length);L.push(V);let J=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${w.registerUniforms(J).declareVariables(...L)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${P}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${_}
    }

    ${T}
    ${B!=null?`let cOffset = ${B.broadcastedIndicesToOffset("vec2(m, n)",V)}; value += ${P}(uniforms.beta) * ${B.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},$=w=>{let _=A("a",e[0].dataType,e[0].dims),T=A("b",e[1].dataType,e[1].dims),x=null,z=[_,T];e.length===3&&(x=A("c",e[2].dataType,e[2].dims.length),z.push(x));let P=Z("output",e[0].dataType,o.length);z.push(P);let B=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],L="",V="";t.transA&&t.transB?(V=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${_.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,L="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(V=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${_.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,L="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(V=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${_.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,L="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(V=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${_.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${T.type.value}(0);
      }
      `,L="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let J=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${w.registerUniforms(B).declareVariables(...z)}
  var<workgroup> tile_a: array<array<${_.type.storage}, ${u}>, ${u}>;
  var<workgroup> tile_b: array<array<${T.type.storage}, ${u}>, ${u}>;
  ${w.mainStart([u,u,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${u};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${u};
    let num_tiles = (uniforms.K - 1) / ${u} + 1;
    var k_start = 0u;
    var value = ${P.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${V}
      k_start = k_start + ${u};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${u}; k++) {
        ${L}
      }
      workgroupBarrier();
    }

    ${J}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${x!=null?`let cOffset = ${x.broadcastedIndicesToOffset("vec2(m, n)",P)}; value += ${P.type.value}(uniforms.beta) * ${x.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return p?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:l*d},programUniforms:h}),getShaderSource:$}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:h}),getShaderSource:y}},wl=e=>{let t=e.transA,r=e.transB,i=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:i,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},bl=(e,t)=>{yl(e.inputs),e.compute(_l(e.inputs,t))}}),ar,fr,ri,ii,$l,vl,xl,Sl,Tl,El,Il,kl,Cl,zl,Zc=E(()=>{be(),he(),b(),de(),[ar,fr,ri,ii]=[0,1,2,3],$l=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},vl=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,xl=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Sl=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Tl=e=>`
  ${e.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,El=(e,t,r)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${ar}] = batch;
     indices[${fr}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${ri}] = u32(r);
            indices[${ii}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case"border":return`
          indices[${ri}] = u32(clamp(r, 0, H - 1));
          indices[${ii}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${ri}] = gs_reflect(r, border[1], border[3]);
          indices[${ii}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${r.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices("indices")};
  }
`,Il=(e,t,r)=>(()=>{switch(r.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${ar}], indices[${fr}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${ar}], indices[${fr}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${ar}], indices[${fr}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${ar}], indices[${fr}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${ar}], indices[${fr}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${ar}], indices[${fr}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,kl=(e,t)=>{let r=A("x",e[0].dataType,e[0].dims.length),i=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],a=A("grid",e[1].dataType,i.length,2),n=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(n=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[ar,fr,ri,ii]=[0,3,1,2]);let s=Z("output",e[0].dataType,n.length),o=r.type.value,u=N.size(n),l=[{type:12,data:u},...k(e[0].dims,i,n)],d=p=>`
  ${p.registerUniform("output_size","u32").declareVariables(r,a,s)}
  ${vl}
  ${xl(o)}
  ${Sl(t)}
  ${Tl(t)}
  ${El(r,o,t)}

  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${ri}]);
      let W_in = i32(uniforms.x_shape[${ii}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${s.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${ar}], indices[${ri}], indices[${ii}]);
      let nxy = ${a.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${Il(s,o,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:p=>{let f=N.size(n);return{outputs:[{dims:n,dataType:p[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:l}},getShaderSource:d}},Cl=(e,t)=>{$l(e.inputs),e.compute(kl(e.inputs,t))},zl=e=>g({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),Et,Al,Ol,Rn,Rl,ma,Ml,Bl=E(()=>{be(),he(),b(),bi(),dn(),de(),ht(),Et=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,Al=(e,t)=>{let r=e[0],i=Et(e,1),a=Et(e,2),n=Et(e,3),s=Et(e,4),o=Et(e,5),u=Et(e,6),l=Et(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let d=r.dims[0],p=r.dims[1],f=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],h=p,m=0,y=0,$=Math.floor(f/t.numHeads);if(u&&l&&N.size(u.dims)&&N.size(l.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==t.numHeads||u.dims[3]!==$)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==d||l.dims[1]!==t.numHeads||l.dims[3]!==$)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');m=u.dims[2],y=u.dims[2]}else if(u&&N.size(u.dims)||l&&N.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w;if(i&&N.size(i.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(i.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');w=2,h=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==$)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');w=5,h=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==$)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');w=0,h=i.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}if(n&&N.size(n.dims)>0){if(n.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(i&&i.dims.length===5&&i.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let _=m+h,T=0;if(s&&N.size(s.dims)>0){T=8;let B=s.dims;throw B.length===1?B[0]===d?T=1:B[0]===3*d+2&&(T=3):B.length===2&&B[0]===d&&B[1]===_&&(T=5),T===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let x=!1,z=f;if(a&&N.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(h!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');z=a.dims[2]}else{if(h!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');z=a.dims[1]*a.dims[3],x=!0}}let P=!1;if(s&&N.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(o&&N.size(o.dims)>0){if(o.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(o.dims[0]!==d||o.dims[1]!==t.numHeads||o.dims[2]!==p||o.dims[3]!==_)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:p,pastSequenceLength:m,kvSequenceLength:h,totalSequenceLength:_,maxSequenceLength:y,inputHiddenSize:0,hiddenSize:f,vHiddenSize:z,headSize:$,vHeadSize:Math.floor(z/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:T,scale:t.scale,broadcastResPosBias:P,passPastInKv:x,qkvFormat:w}},Ol=e=>g({...e}),Rn=g({perm:[0,2,1,3]}),Rl=(e,t,r,i,a,n,s)=>{let o=[i,a,n],u=N.size(o),l=[{type:12,data:u},{type:12,data:s},{type:12,data:n}],d=p=>{let f=Z("qkv_with_bias",t.dataType,o),h=A("qkv",t.dataType,o),m=A("bias",r.dataType,o),y=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${p.registerUniforms(y).declareVariables(h,m,f)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l}),getShaderSource:d},{inputs:[t,r],outputs:[-1]})[0]},ma=(e,t,r,i,a,n,s,o)=>{let u=n;if(s&&N.size(s.dims)>0){if(i===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=Rl(e,n,s,t,i,r*a,o),u=u.reshape([t,i,r,a]),r===1||i===1?u:e.compute(bt(u,Rn.perm),{inputs:[u],outputs:[-1]})[0]}else return n.dims.length===3&&(u=n.reshape([t,i,r,a])),r===1||i===1?u:e.compute(bt(u,Rn.perm),{inputs:[u],outputs:[-1]})[0]},Ml=(e,t)=>{let r=Al(e.inputs,t),i=e.inputs[0],a=Et(e.inputs,1),n=Et(e.inputs,2),s=Et(e.inputs,3),o=Et(e.inputs,4),u=Et(e.inputs,5),l=Et(e.inputs,6),d=Et(e.inputs,7);if(i.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let p=a&&n&&a.dims.length===4&&n.dims.length===4,f=ma(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,i,s,0);if(p)return da(e,f,a,n,o,void 0,l,d,u,r);if(!a||!n)throw new Error("key and value must be provided");let h=ma(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,s,r.hiddenSize),m=ma(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,n,s,2*r.hiddenSize);da(e,f,h,m,o,void 0,l,d,u,r)}}),Dl,Pl,Ul,Nl,Mn,Ll,ql,Vl=E(()=>{be(),he(),b(),de(),Dl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Pl=(e,t)=>{let r=[],i=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),i=r.length),g({numOutputs:i,axis:t.axis,splitSizes:r})},Ul=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${U("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,Nl=e=>{let t=e.length,r=[];for(let i=0;i<t;++i){let a=e[i].setByIndices("indices","input[global_idx]");t===1?r.push(a):i===0?r.push(`if (output_number == ${i}u) { ${a} }`):i===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${i}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},Mn=(e,t)=>{let r=e[0].dims,i=N.size(r),a=e[0].dataType,n=N.normalizeAxis(t.axis,r.length),s=new Array(t.numOutputs),o=A("input",a,r.length),u=new Array(t.numOutputs),l=[],d=[],p=0,f=[{type:12,data:i}];for(let m=0;m<t.numOutputs;m++){p+=t.splitSizes[m],u[m]=p;let y=r.slice();y[n]=t.splitSizes[m],d.push(y),s[m]=Z(`output${m}`,a,y.length),l.push({dims:d[m],dataType:e[0].dataType})}f.push({type:12,data:u},...k(r,...d));let h=m=>`
  ${m.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(o,...s)}
  ${Ul(u.length)}
  ${Nl(s)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${o.offsetToIndices("global_idx")};
    var index = ${o.indicesGet("indices",n)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${U("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${o.indicesSet("indices",n,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:h,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(i/64)},programUniforms:f})}},Ll=(e,t)=>{Dl(e.inputs);let r=e.inputs.length===1?t:Pl(e.inputs,t);e.compute(Mn(e.inputs,r),{inputs:[0]})},ql=e=>{let t=e.axis,r=e.splitSizes,i=e.numOutputs<0?r.length:e.numOutputs;if(i!==r.length)throw new Error("numOutputs and splitSizes lengh must be equal");return g({axis:t,numOutputs:i,splitSizes:r})}}),Fl,Na,Wl,Gl=E(()=>{be(),he(),b(),de(),Fl=(e,t)=>{let[r,i,a,n]=e,{numHeads:s,rotaryEmbeddingDim:o}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!N.areEqual(i.dims,[])&&!N.areEqual(i.dims,[1])&&i.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(n.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${n.dims.length}`);if(!N.areEqual(a.dims,n.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(o>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=r.dims[0],l=r.dims[r.dims.length-2],d=a.dims[0],p=N.sizeFromDimension(r.dims,1)/l,f=o===0?a.dims[1]*2:p/s;if(o>f)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(i.dims.length===2){if(u!==i.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${i.dims[0]}`);if(l!==i.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${i.dims[1]}`)}if(f/2!==a.dims[1]&&o/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`);if(l>d)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Na=(e,t)=>{let{interleaved:r,numHeads:i,rotaryEmbeddingDim:a,scale:n}=t,s=e[0].dims[0],o=N.sizeFromDimension(e[0].dims,1),u=e[0].dims[e[0].dims.length-2],l=o/u,d=e[2].dims[1],p=a===0?d*2:l/i,f=new Array(s,u,l/p,p-d),h=N.computeStrides(f),m=[{type:1,data:n},{type:12,data:f},{type:12,data:h},...e[0].dims.length===3?new Array({type:12,data:[o,l,p,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[o,p,u*p,1]}):[],...k(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],y=$=>{let w=A("input",e[0].dataType,e[0].dims.length),_=A("position_ids",e[1].dataType,e[1].dims.length),T=A("cos_cache",e[2].dataType,e[2].dims.length),x=A("sin_cache",e[3].dataType,e[3].dims.length),z=Z("output",e[0].dataType,e[0].dims.length);return $.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:f.length},{name:"global_strides",type:"u32",length:h.length},{name:"input_output_strides",type:"u32",length:h.length}]),`
        ${$.declareVariables(w,_,T,x,z)}

        ${$.mainStart(I)}
          let half_rotary_emb_dim = uniforms.${T.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${_.broadcastedIndicesToOffset("bsnh.xy",Z("",_.type.tensor,2))};
            let position_id =
                u32(${_.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${w.getByOffset("i")} * ${T.get("position_id","bsnh[3]")} -
                ${w.getByOffset("j")} * ${x.get("position_id","bsnh[3]")};
            ${z.setByOffset("i","re")}
            let im = ${w.getByOffset("i")} * ${x.get("position_id","bsnh[3]")} +
                ${w.getByOffset("j")} * ${T.get("position_id","bsnh[3]")};
            ${z.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${z.setByOffset("k",w.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:g({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:y,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(N.size(f)/I)},programUniforms:m})}},Wl=(e,t)=>{Fl(e.inputs,t),e.compute(Na(e.inputs,t))}}),jl,Hl,Bn,Kl,Zl,Qc=E(()=>{b(),be(),dn(),Bl(),Vl(),ht(),Gl(),de(),jl=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let o=!1,u=r.dims[0],l=r.dims[1],d=r.dims.length===3?o?r.dims[2]/3:r.dims[2]:t.numHeads*r.dims[4],p=l,f=0,h=!i||i.dims.length===0,m=Math.floor(h?d/(t.numHeads+2*t.kvNumHeads):d/t.numHeads);h&&(d=m*t.numHeads);let y=n&&n.dims.length!==0,$=s&&s.dims.length!==0;if(y&&n.dims.length===4&&n.dims[0]===u&&n.dims[1]!==t.kvNumHeads&&n.dims[2]===t.kvNumHeads&&n.dims[3]===m)throw new Error("BSNH pastKey/pastValue is not supported");if(y&&$){if(n.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');f=n.dims[2]}else if(y||$)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w=1;if(i&&i.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(r.dims[2]%i.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');p=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==m)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');p=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==m)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');p=i.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}let _=0,T=!1,x=t.kvNumHeads?m*t.kvNumHeads:d;if(a&&a.dims.length>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(p!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');x=a.dims[2]}else{if(p!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');x=a.dims[1]*a.dims[3],T=!0}}let z=e.length>4?e[5]:void 0;if(z&&z.dims.length!==1&&z.dims[0]!==u)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:u,sequenceLength:l,pastSequenceLength:f,kvSequenceLength:p,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:d,vHiddenSize:x,headSize:m,vHeadSize:Math.floor(x/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:_,scale:t.scale,broadcastResPosBias:!1,passPastInKv:T,qkvFormat:w}},Hl=g({perm:[0,2,1,3]}),Bn=(e,t,r)=>{let i=t,a=r.kvNumHeads;return t.dims.length===3&&r.kvSequenceLength!==0&&(i=t.reshape([r.batchSize,r.kvSequenceLength,a,r.headSize]),i=e.compute(bt(i,Hl.perm),{inputs:[i],outputs:[-1]})[0]),i},Kl=(e,t,r,i)=>{let a=7,n=["type","type"],s=[e*t],o=e*t,u=[{type:12,data:o},{type:12,data:t},{type:12,data:e}],l=d=>{let p=A("seq_lens",r.dataType,r.dims),f=A("total_seq_lens",i.dataType,i.dims),h=Z("pos_ids",a,s),m=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${d.registerUniforms(m).declareVariables(p,f,h)}
  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${f.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${p.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${h.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${h.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${h.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:n},getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:u}),getShaderSource:l}},Zl=(e,t)=>{var x;let r=jl(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((x=e.inputs[1])==null?void 0:x.dims.length)===5)throw new Error("Packed KV is not implemented");let i=e.inputs[0],a=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,n=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,s=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,o=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,u=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,d=r.kvNumHeads?r.kvNumHeads:r.numHeads,p=g({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,d*r.headSize,d*r.headSize]}),[f,h,m]=!a&&!n?e.compute(Mn([i],p),{inputs:[i],outputs:[-1,-1,-1]}):[i,a,n],y,$;if(t.doRotary){let z=e.compute(Kl(r.batchSize,r.sequenceLength,u,l),{inputs:[u,l],outputs:[-1]})[0],P=e.inputs[7],B=e.inputs[8],L=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),V=[f,z,P,B],J=[-1];y=e.compute(Na(V,L),{inputs:V,outputs:J})[0],V.splice(0,1,h);let we=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});$=e.compute(Na(V,we),{inputs:V,outputs:J})[0]}let w=ma(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,t.doRotary?y:f,void 0,0),_=Bn(e,t.doRotary?$:h,r),T=Bn(e,m,r);da(e,w,_,T,void 0,void 0,s,o,void 0,r,u,l)}}),Dn,Ql,Xl,Yl,Xc=E(()=>{be(),he(),ht(),de(),Dn=(e,t,r,i,a,n,s,o)=>{let u=M(n),l=u===1?"f32":`vec${u}f`,d=u===1?"vec2f":`mat2x${u}f`,p=a*s,f=64;p===1&&(f=256);let h=[a,s,n/u],m=[a,s,2],y=["rank","type","type"],$=[];$.push(...k(h,m));let w=_=>{let T=A("x",t.dataType,3,u),x=A("scale",r.dataType,r.dims),z=A("bias",i.dataType,i.dims),P=Z("output",1,3,2),B=[T,x,z,P];return`
  var<workgroup> workgroup_shared : array<${d}, ${f}>;
  const workgroup_size = ${f}u;
  ${_.declareVariables(...B)}
  ${_.mainStart(f)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${T.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${d}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${K("workgroup_shared[0][0]",u)} / f32(hight * ${u});
      let squared_sum_final = ${K("workgroup_shared[0][1]",u)} / f32(hight * ${u});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${o}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${o};${f}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:m,dataType:1}],dispatchGroup:{x:p},programUniforms:$}),getShaderSource:w},{inputs:[t,r,i],outputs:[-1]})[0]},Ql=(e,t,r)=>{let i=t[0].dims,a=i,n=2,s=i[0],o=i[1],u=N.sizeFromDimension(i,n),l=M(u),d=N.size(a)/l,p=Dn(e,t[0],t[1],t[2],s,u,o,r.epsilon),f=[s,o,u/l],h=[s,o],m=["type","none"],y=$=>{let w=A("x",t[0].dataType,f.length,l),_=A("scale_shift",1,h.length,2),T=Z("output",t[0].dataType,f.length,l),x=[w,_,T];return`
  ${$.registerUniform("output_size","u32").declareVariables(...x)}
  ${$.mainStart()}
  ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${T.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${_.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${w.getByOffset("global_idx")} * ${T.type.value}(scale_shift.x) + ${T.type.value}(scale_shift.y);
      ${T.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:[{type:12,data:d},...k(f,h,f)]}),getShaderSource:y},{inputs:[t[0],p]})},Xl=(e,t,r)=>{let i=t[0].dims,a=i,n=i[0],s=i[i.length-1],o=N.sizeFromDimension(i,1)/s,u=M(s),l=N.size(a)/u,d=[{type:12,data:o},{type:12,data:Math.floor(s/u)}],p=["type","type"],f=!1,h=[0,i.length-1];for(let w=0;w<i.length-2;w++)f=f||i[w+1]!==1,h.push(w+1);f=f&&i[i.length-1]!==1;let m=f?e.compute(bt(e.inputs[0],h),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:i.length},(w,_)=>i[h[_]])),y=Dn(e,m,t[1],t[2],n,o,s,r.epsilon),$=w=>{let _=R(t[0].dataType),T=u===1?"vec2f":`mat${u}x2f`,x=B=>{let L=B===0?"x":"y",V=u===1?"f32":`vec${u}f`;switch(u){case 1:return`${_}(${V}(scale.${L}))`;case 2:return`vec2<${_}>(${V}(scale[0].${L}, scale[1].${L}))`;case 4:return`vec4<${_}>(${V}(scale[0].${L}, scale[1].${L}, scale[2].${L}, scale[3].${L}))`;default:throw new Error(`Not supported compoents ${u}`)}},z=A("input",t[0].dataType,t[0].dims,u),P=Z("output",t[0].dataType,a,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${z.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${T}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${P.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${w.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${x(0)}, ${x(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:$},{inputs:[t[0],y]})},Yl=(e,t)=>{t.format==="NHWC"?Xl(e,e.inputs,t):Ql(e,e.inputs,t)}}),Jl,ed,td,Yc=E(()=>{be(),he(),de(),Jl=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},ed=(e,t,r)=>{let i=t.simplified,a=e[0].dims,n=e[1],s=!i&&e[2],o=a,u=N.normalizeAxis(t.axis,a.length),l=N.sizeToDimension(a,u),d=N.sizeFromDimension(a,u),p=N.size(n.dims),f=s?N.size(s.dims):0;if(p!==d||s&&f!==d)throw new Error(`Size of X.shape()[axis:] == ${d}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${p} and bias size of ${f}`);let h=[];for(let z=0;z<a.length;++z)z<u?h.push(a[z]):h.push(1);let m=M(d),y=["type","type"],$=[{type:12,data:l},{type:1,data:d},{type:12,data:Math.floor(d/m)},{type:1,data:t.epsilon}];s&&y.push("type");let w=r>1,_=r>2,T=z=>{let P=R(e[0].dataType),B=[A("x",e[0].dataType,e[0].dims,m),A("scale",n.dataType,n.dims,m)];s&&B.push(A("bias",s.dataType,s.dims,m)),B.push(Z("output",e[0].dataType,o,m)),w&&B.push(Z("mean_data_output",1,h)),_&&B.push(Z("inv_std_output",1,h));let L=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${z.registerUniforms(L).declareVariables(...B)}
  ${z.mainStart()}
    ${z.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${F("f32",m)};
    var mean_square_vector = ${F("f32",m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${j(P,m,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${K("mean_vector",m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${K("mean_square_vector",m)} / uniforms.norm_size ${i?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${j(P,m,"x[j + offset]")};
      let f32scale = ${j(P,m,"scale[j]")};
      output[j + offset] = ${B[0].type.value}((f32input ${i?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${j(P,m,"bias[j]")}`:""}
      );
    }

    ${w?"mean_data_output[global_idx] = mean":""};
    ${_?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},x=[{dims:o,dataType:e[0].dataType}];return w&&x.push({dims:h,dataType:1}),_&&x.push({dims:h,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${m};${r};${i}`,inputDependencies:y},getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:$}),getShaderSource:T}},td=(e,t)=>{Jl(e.inputs),e.compute(ed(e.inputs,t,e.outputCount))}}),rd,id,Jc=E(()=>{he(),_n(),vn(),rd=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},id=e=>{rd(e.inputs);let t=tr.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],i=e.inputs[0].dims[e.inputs[0].dims.length-1];if(r<8&&i<8)e.compute(yn(e.inputs,{activation:""},t));else{let a=t[t.length-2],n=N.size(e.inputs[0].dims.slice(0,-2)),s=N.size(e.inputs[1].dims.slice(0,-2));if(n!==1&&a===1&&s===1){let o=e.inputs[0].reshape([1,n,i]),u=e.inputs[1].reshape([1,i,r]),l=[1,n,r],d=[o,u];e.compute(Ba(d,{activation:""},t,l),{inputs:d})}else e.compute(Ba(e.inputs,{activation:""},t))}}}),ad,nd,sd,od,ud,ef=E(()=>{be(),he(),b(),de(),ad=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],i=r.dims.length;if(r.dims[i-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),n=t.blockSize/8*t.bits,s=e[1];if(!N.areEqual(s.dims,[t.n,a,n]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let o=e[2].dims;if(N.size(o)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let u=e[3].dims,l=t.bits>4?t.n*a:t.n*Math.floor((a+1)/2);if(N.size(u)!==l)throw new Error("zeroPoints input size error.")}},nd=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=N.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=M(t.k),f=M(l),h=M(s),m=o.concat([a,s]),y=a>1&&s/h%2===0?2:1,$=N.size(m)/h/y,w=64,_=[],T=[u,a,n/p],x=N.convertShape(e[1].dims).slice();x.splice(-1,1,l/f),_.push(...k(T)),_.push(...k(x)),_.push(...k(e[2].dims)),e.length===4&&_.push(...k(N.convertShape(e[3].dims)));let z=[u,a,s/h];_.push(...k(z));let P=B=>{let L=T.length,V=A("a",e[0].dataType,L,p),J=A("b",12,x.length,f),we=A("scales",e[2].dataType,e[2].dims.length),oe=[V,J,we],ye=e.length===4?A("zero_points",12,e[3].dims.length):void 0;ye&&oe.push(ye);let Ue=z.length,Ae=Z("output",e[0].dataType,Ue,h),me=R(e[0].dataType),Oe=(()=>{switch(p){case 1:return`array<${me}, 8>`;case 2:return`mat4x2<${me}>`;case 4:return`mat2x4<${me}>`;default:throw new Error(`${p}-component is not supported.`)}})(),pe=()=>{let G=`
          // reuse a data
            var input_offset = ${V.indicesToOffset(`${V.type.indices}(batch, row, word_offset)`)};
            var a_data: ${Oe};
            for (var j: u32 = 0; j < ${8/p}; j++) {
              a_data[j] = ${V.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let te=0;te<h*y;te++)G+=`
            b_value = ${f===1?`b${te}_data`:`b${te}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${Oe}(${Array.from({length:4},(ge,Re)=>`${me}(b_value_lower[${Re}]), ${me}(b_value_upper[${Re}])`).join(", ")});
            b_dequantized_values = ${p===1?`${Oe}(${Array.from({length:8},(ge,Re)=>`(b_quantized_values[${Re}] - ${ye?`zero_point${te}`:"zero_point"}) * scale${te}`).join(", ")});`:`(b_quantized_values - ${Oe}(${Array(8).fill(`${ye?`zero_point${te}`:"zero_point"}`).join(",")})) * scale${te};`};
            workgroup_shared[local_id.x * ${y} + ${Math.floor(te/h)}]${h>1?`[${te%h}]`:""} += ${Array.from({length:8/p},(ge,Re)=>`${p===1?`a_data[${Re}] * b_dequantized_values[${Re}]`:`dot(a_data[${Re}], b_dequantized_values[${Re}])`}`).join(" + ")};
          `;return G},Te=()=>{let G=`
            var col_index = col * ${h};
            ${ye?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${me}(8);`}
            `;for(let te=0;te<h*y;te++)G+=`
            let scale${te} = ${we.getByOffset("col_index * nBlocksPerCol + block")};
            ${ye?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${ye.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${te} = ${me}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return G},_t=()=>{let G=`col_index = col * ${h};`;for(let te=0;te<h*y;te++)G+=`
            let b${te}_data = ${J.getByIndices(`${J.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return G+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${Oe};
            var b_dequantized_values: ${Oe};`,G};return`
        var<workgroup> workgroup_shared: array<${Ae.type.value}, ${y*w}>;
        ${B.declareVariables(...oe,Ae)}
        ${B.mainStart([w,1,1])}
          let output_indices = ${Ae.offsetToIndices(`(global_idx / ${w}) * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${w}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/p};
            ${Te()}
            for (var word: u32 = 0; word < ${l}; word += ${f}) {
              ${_t()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${pe()}
                word_offset += ${8/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${y}) {
            var output_value: ${Ae.type.value} = ${Ae.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${w}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${y};
            }
            ${Ae.setByIndices(`${Ae.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${p};${f};${h};${y};${w}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:m,dataType:d}],dispatchGroup:{x:$},programUniforms:_}),getShaderSource:P}},sd=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=N.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=M(t.k),f=M(l),h=o.concat([a,s]),m=128,y=s%8===0?8:s%4===0?4:1,$=m/y,w=$*f*8,_=w/p,T=w/t.blockSize,x=N.size(h)/y,z=[],P=[u,a,n/p],B=N.convertShape(e[1].dims).slice();B.splice(-1,1,l/f),z.push(...k(P)),z.push(...k(B)),z.push(...k(e[2].dims)),e.length===4&&z.push(...k(N.convertShape(e[3].dims)));let L=[u,a,s];z.push(...k(L));let V=J=>{let we=P.length,oe=A("a",e[0].dataType,we,p),ye=A("b",12,B.length,f),Ue=A("scales",e[2].dataType,e[2].dims.length),Ae=[oe,ye,Ue],me=e.length===4?A("zero_points",12,e[3].dims.length):void 0;me&&Ae.push(me);let Oe=L.length,pe=Z("output",e[0].dataType,Oe),Te=R(e[0].dataType),_t=()=>{switch(p){case 1:return`
          let a_data0 = vec4<${Te}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Te}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Te}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Te}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${p}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${oe.type.value}, ${_}>;
        var<workgroup> inter_results: array<array<${pe.type.value}, ${$}>, ${y}>;
        ${J.declareVariables(...Ae,pe)}
        ${J.mainStart([$,y,1])}
          let output_indices = ${pe.offsetToIndices(`workgroup_index * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${T} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${_};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${_}; a_offset += ${m})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${oe.getByIndices(`${oe.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${oe.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${T} + local_id.x;
            ${me?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${me.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Te}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Te}(8);`}
            let scale = ${Ue.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${ye.getByIndices(`${ye.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/p};
            for (var i: u32 = 0; i < ${f}; i++) {
              ${_t()}
              let b_value = ${f===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${Te}>(${Array.from({length:4},(G,te)=>`${Te}(b_value_lower[${te}]), ${Te}(b_value_upper[${te}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${Te}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(G,te)=>`${`dot(a_data${te}, b_dequantized_values[${te}])`}`).join(" + ")};
              word_offset += ${8/p};
            }
            workgroupBarrier();
          }

          if (local_idx < ${y}) {
            var output_value: ${pe.type.value} = ${pe.type.value}(0);
            for (var b = 0u; b < ${$}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${pe.setByIndices(`${pe.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${p};${f};${$};${y}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:h,dataType:d}],dispatchGroup:{x},programUniforms:z}),getShaderSource:V}},od=(e,t)=>{ad(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(sd(e.inputs,t)):e.compute(nd(e.inputs,t))},ud=e=>g(e)}),ld,dd,pd,cd,fd,hd,md,gd,yd,tf=E(()=>{be(),he(),de(),ld=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},dd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
            k = i32(${e.indicesGet("indices",a)}) - ${U("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${U("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${U("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${i}
            value = x[offset];
          }
      `},pd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${U("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${U("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${U("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${U("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},cd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${U("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${U("uniforms.x_shape",a,t)})) {
                  k = i32(${U("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${U("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},fd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${U("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${U("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${U("uniforms.x_shape",a,t)})) {
                  k -= i32(${U("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${U("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},hd=(e,t,r)=>{switch(r.mode){case 0:return dd(e,t,r.pads.length);case 1:return pd(e,t,r.pads.length);case 2:return cd(e,t,r.pads.length);case 3:return fd(e,t,r.pads.length);default:throw new Error("Invalid mode")}},md=(e,t)=>{let r=N.padShape(e[0].dims.slice(),t.pads),i=e[0].dims,a=N.size(r),n=[{type:12,data:a},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&n.push({type:s?e[2].dataType:1,data:t.value}),n.push(...k(e[0].dims,r));let o=["rank"],u=l=>{let d=Z("output",e[0].dataType,r.length),p=A("x",e[0].dataType,i.length),f=p.type.value,h=hd(d,i.length,t),m=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&m.push({name:"constant_value",type:s?f:"f32"}),`
            ${l.registerUniforms(m).declareVariables(p,d)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${d.offsetToIndices("global_idx")};

            var value = ${f}(0);
            ${h}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:o},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(N.size(r)/64)},programUniforms:n}),getShaderSource:u}},gd=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),i=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,n=new Int32Array(2*a).fill(0);if(e.length>=4){let o=e[3].getBigInt64Array();for(let u=0;u<o.length;u++)n[Number(o[u])]=Number(r[u]),n[Number(o[u])+a]=Number(r[u+o.length])}else r.forEach((o,u)=>n[Number(u)]=Number(o));let s=[];return n.forEach(o=>s.push(o)),{mode:t.mode,value:i,pads:s}}else return t},yd=(e,t)=>{ld(e.inputs);let r=gd(e.inputs,t);e.compute(md(e.inputs,r),{inputs:[0]})}}),ga,Pn,Un,Nn,Ln,_d,wd,qn,Vn,bd,$d,Fn,vd,xd,Wn,Sd,Td,Ed,Id,rf=E(()=>{ct(),be(),he(),de(),ga=e=>{if(Q.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Pn=(e,t,r)=>{let i=t.format==="NHWC",a=e.dims.slice();i&&a.splice(1,0,a.pop());let n=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),o=t.strides.slice(),u=n?t.dilations.slice():[],l=t.pads.slice();gr.adjustPoolAttributes(r,a,s,o,u,l);let d=gr.computePoolOutputShape(r,a,o,u,s,l,t.autoPad),p=Object.assign({},t);n?Object.assign(p,{kernelShape:s,strides:o,pads:l,dilations:u,cacheKey:t.cacheKey}):Object.assign(p,{kernelShape:s,strides:o,pads:l,cacheKey:t.cacheKey});let f=d.slice();return f.push(f.splice(1,1)[0]),[p,i?f:d]},Un=(e,t)=>{let r=t.format==="NHWC",i=N.size(e),a=N.size(t.kernelShape),n=[{type:12,data:i},{type:12,data:a}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let o=t.kernelShape[t.kernelShape.length-1],u=t.strides[t.strides.length-1],l=t.pads[t.pads.length/2-1],d=t.pads[t.pads.length-1],p=!!(l+d);n.push({type:12,data:o},{type:12,data:u},{type:12,data:l},{type:12,data:d}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let f=!1;if(t.kernelShape.length===2){let h=t.kernelShape[t.kernelShape.length-2],m=t.strides[t.strides.length-2],y=t.pads[t.pads.length/2-2],$=t.pads[t.pads.length-2];f=!!(y+$),n.push({type:12,data:h},{type:12,data:m},{type:12,data:y},{type:12,data:$}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[n,s,!0,p,f]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let o=N.computeStrides(t.kernelShape);n.push({type:12,data:o},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:o.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let u=t.pads.reduce((l,d)=>l+d);return[n,s,!!u,!1,!1]}},Nn=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f=a.format==="NHWC",h=t.type.value,m=Z("output",t.type.tensor,i);if(a.kernelShape.length<=2){let y="",$="",w="",_=r-(f?2:1);if(d?y=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${_}] = indices[${_}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${_}] < 0 || xIndices[${_}]
                      >= uniforms.x_shape[${_}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${n}
                }`:y=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${_}] = indices[${_}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${n}
                }`,a.kernelShape.length===2){let T=r-(f?3:2);p?$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${T}] = indices[${T}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${T}] < 0 || xIndices[${T}] >= uniforms.x_shape[${T}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${T}] = indices[${T}] * uniforms.sh - uniforms.phStart + j;
                `,w=`
              }
            `}return`
            ${e.registerUniforms(u).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${m.offsetToIndices("global_idx")};
              var xIndices = ${m.offsetToIndices("global_idx")};

              var value = ${h}(${o});
              var pad = 0;
              ${$}
              ${y}
              ${w}
              ${s}

              output[global_idx] = value;
            }`}else{if(f)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let y=a.kernelShape.length,$=a.pads.length,w="";return l?w=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${n}
              }`:w=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${n}
            `,`
            ${e.registerUniforms(u).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${m.offsetToIndices("global_idx")};
              var xIndices = ${m.offsetToIndices("global_idx")};

              var offsets: array<u32, ${y}>;

              var value = ${h}(${o});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${y-1}u; j++) {
                  offsets[j] = offset / ${U("uniforms.kernelStrides","j",y)};
                  offset -= offsets[j] * ${U("uniforms.kernelStrides","j",y)};
                }
                offsets[${y-1}] = offset;

                isPad = false;
                for (var j = ${r-y}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${U("uniforms.strides",`j - ${r-y}u`,y)}
                    + offsets[j - ${r-y}u] - ${U("uniforms.pads","j - 2u",$)};
                  ${w}
              }
              ${s}

              output[global_idx] = value;
            }`}},Ln=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,_d=e=>`${Ln(e)};${e.countIncludePad}`,wd=e=>`${Ln(e)};${e.storageOrder};${e.dilations}`,qn=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),Vn=(e,t,r,i)=>{let[a,n]=Pn(t,i,r),s=A("x",t.dataType,t.dims.length),o=s.type.value,u="value += x_val;",l="";a.countIncludePad?l+=`value /= ${o}(uniforms.kernelSize);`:l+=`value /= ${o}(i32(uniforms.kernelSize) - pad);`;let[d,p,f,h,m]=Un(n,a);d.push(...k(t.dims,n));let y=["rank"];return{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(N.size(n)/64)},programUniforms:d}),getShaderSource:$=>Nn($,s,t.dims.length,n.length,a,u,l,0,p,f,h,m)}},bd=e=>{let t=e.count_include_pad!==0,r=qn(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let i={countIncludePad:t,...r,cacheKey:""};return{...i,cacheKey:_d(i)}},$d=(e,t)=>{ga(e.inputs),e.compute(Vn("AveragePool",e.inputs[0],!1,t))},Fn={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},vd=e=>{let t=e.format;return{format:t,...Fn,cacheKey:t}},xd=(e,t)=>{ga(e.inputs),e.compute(Vn("GlobalAveragePool",e.inputs[0],!0,t))},Wn=(e,t,r,i)=>{let[a,n]=Pn(t,i,r),s=`
      value = max(x_val, value);
    `,o="",u=A("x",t.dataType,t.dims.length),l=["rank"],[d,p,f,h,m]=Un(n,a);return d.push(...k(t.dims,n)),{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(N.size(n)/64)},programUniforms:d}),getShaderSource:y=>Nn(y,u,t.dims.length,n.length,a,s,o,t.dataType===10?-65504:-1e5,p,f,h,m)}},Sd=(e,t)=>{ga(e.inputs),e.compute(Wn("MaxPool",e.inputs[0],!1,t))},Td=e=>{let t=e.storage_order,r=e.dilations,i=qn(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...i,cacheKey:""};return{...a,cacheKey:wd(a)}},Ed=e=>{let t=e.format;return{format:t,...Fn,cacheKey:t}},Id=(e,t)=>{ga(e.inputs),e.compute(Wn("GlobalMaxPool",e.inputs[0],!0,t))}}),kd,Cd,zd,Ad,af=E(()=>{be(),he(),b(),de(),kd=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,i)=>r===e[2].dims[i]).reduce((r,i)=>r&&i,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,n)=>n===t.axis||a===e[0].dims[n]).reduce((a,n)=>a&&n,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],i=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/i)||t.blockSize>Math.ceil(r/(i-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Cd=(e,t)=>{let r=N.normalizeAxis(t.axis,e[0].dims.length),i=e[0].dataType,a=i===3,n=e[0].dims,s=e[1].dataType,o=N.size(n),u=i===3||i===2,l=u?[Math.ceil(N.size(e[0].dims)/4)]:e[0].dims,d=e[1].dims,p=e.length>2?e[2]:void 0,f=p?u?[Math.ceil(N.size(p.dims)/4)]:p.dims:void 0,h=d.length===0||d.length===1&&d[0]===1,m=h===!1&&d.length===1,y=M(o),$=h&&(!u||y===4),w=$?y:1,_=$&&!u?y:1,T=A("input",u?12:i,l.length,_),x=A("scale",s,d.length),z=p?A("zero_point",u?12:i,f.length):void 0,P=Z("output",s,n.length,w),B=[T,x];z&&B.push(z);let L=[l,d];p&&L.push(f);let V=[{type:12,data:o/w},{type:12,data:r},{type:12,data:t.blockSize},...k(...L,n)],J=we=>{let oe=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${we.registerUniforms(oe).declareVariables(...B,P)}
      ${we.mainStart()}
          ${we.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${P.offsetToIndices("global_idx")};

          // Set input x
          ${u?`
            let input = ${T.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${w===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${T.getByOffset("global_idx")};`};

          // Set scale input
          ${h?`let scale_value= ${x.getByOffset("0")}`:m?`
            let scale_index = ${P.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${x.getByOffset("scale_index")};`:`
            var scale_indices: ${x.type.indices} = output_indices;
            let index = ${x.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${x.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${x.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${z?h?u?`
                let zero_point_input = ${z.getByOffset("0")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${z.getByOffset("0")}`:m?u?`
                let zero_point_index = ${P.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${z.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${P.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${z.getByOffset("zero_point_index")};`:u?`
                let zero_point_offset = ${x.indicesToOffset("scale_indices")};
                let zero_point_input = ${z.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${z.getByIndices("scale_indices")};`:`let zero_point_value = ${u?a?"i32":"u32":T.type.value}(0);`};
      // Compute and write output
      ${P.setByOffset("global_idx",`${P.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:z?["rank","rank","rank"]:["rank","rank"]},getShaderSource:J,getRunData:()=>({outputs:[{dims:n,dataType:s}],dispatchGroup:{x:Math.ceil(o/w/64),y:1,z:1},programUniforms:V})}},zd=(e,t)=>{kd(e.inputs,t),e.compute(Cd(e.inputs,t))},Ad=e=>g({axis:e.axis,blockSize:e.blockSize})}),Od,Rd,Md,nf=E(()=>{ct(),be(),de(),Od=(e,t,r)=>{let i=e===t,a=e<t&&r<0,n=e>t&&r>0;if(i||a||n)throw new Error("Range these inputs' contents are invalid.")},Rd=(e,t,r,i)=>{let a=Math.abs(Math.ceil((t-e)/r)),n=[a],s=a,o=[{type:12,data:s},{type:i,data:e},{type:i,data:r},...k(n)],u=l=>{let d=Z("output",i,n.length),p=d.type.value,f=[{name:"outputSize",type:"u32"},{name:"start",type:p},{name:"delta",type:p}];return`
        ${l.registerUniforms(f).declareVariables(d)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${p}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${i}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:n,dataType:i}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:o})}},Md=e=>{let t=0,r=0,i=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],i=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],i=e.inputs[2].getFloat32Array()[0]),Q.webgpu.validateInputContent&&Od(t,r,i),e.compute(Rd(t,r,i,e.inputs[0].dataType),{inputs:[]})}}),Bd,Gn,jn,Dd,Pd,Ud,sf=E(()=>{be(),he(),b(),de(),Bd=(e,t,r,i)=>{if(e!=="none"&&i!=="i32"&&i!=="u32"&&i!=="f32")throw new Error(`Input ${i} is not supported with reduction ${e}.`);let a=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,n=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case"none":return`${t}=${r};`;case"add":return i==="i32"||i==="u32"?`atomicAdd(&${t}, bitcast<${i}>(${r}));`:`
              ${a}bitcast<${i}>(oldValue) + (${r})${n}`;case"max":return i==="i32"||i==="u32"?`atomicMax(&${t}, bitcast<${i}>(${r}));`:`
                ${a}max(bitcast<f32>(oldValue), (${r}))${n}`;case"min":return i==="i32"||i==="u32"?`atomicMin(&${t}, bitcast<${i}>(${r}));`:`${a}min(bitcast<${i}>(oldValue), (${r}))${n}`;case"mul":return`${a}(bitcast<${i}>(oldValue) * (${r}))${n}`;default:throw new Error(`Reduction ${e} is not supported.`)}},Gn=(e,t)=>`${e===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[${t?"i - indices_start":"i"}];
    let dim_value = uniforms.output_shape[${t?"i - indices_start":"i"} + uniforms.last_index_dimension];`}
    
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));`,jn=(e,t,r)=>`for (var i = 0u; i < uniforms.num_updates_elements; i++) {
        let value = updates[uniforms.num_updates_elements * ${r?"global_idx":"idx"} + i];
        ${Bd(e.reduction,"output[data_offset + i]","value",t)}
      }`,Dd=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r,n=1,s=Math.ceil(N.size(i)/n),o=i[i.length-1],u=N.sizeFromDimension(r,o),l=N.sizeFromDimension(i,0)/o,d=[{type:12,data:s},{type:12,data:o},{type:12,data:u},...k(e[1].dims,e[2].dims,a)],p=f=>{let h=A("indices",e[1].dataType,e[1].dims.length),m=A("updates",e[2].dataType,e[2].dims.length,n),y=t.reduction!=="none"&&t.reduction!==""?Qe("output",e[0].dataType,a.length):Z("output",e[0].dataType,a.length,n);return`
      ${f.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(h,m,y)}
      ${f.mainStart()}
        ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var hasDuplicates = false;
  if (${t.reduction==="none"}) {
    for (var i = 0; i < ${l}; i = i + 1) {
      for (var j = i + 1; j < ${l}; j = j + 1) {
        var index_i = i32(indices[i].x);
        var index_j = i32(indices[j].x);
        if (index_i == index_j) {
          hasDuplicates = true;
          break;
        }
      }
      if (hasDuplicates) {
        break;
      }
    }
  }

  if (${t.reduction==="none"} && hasDuplicates) {
    if (global_idx != 0u) {
      return;
    }
    // Process each index-update pair individually when duplicates exist
    for (var idx = 0u; idx < ${l}u; idx++) {
      var data_offset = 0u;
      for (var i = 0u; i < uniforms.last_index_dimension; i++) {
        var index = i32(indices[idx * uniforms.last_index_dimension + i].x);
        ${Gn(r.length,!1)}
      }
      ${jn(t,y.type.value,!1)}
    }
    return;
  }

  var data_offset = 0u;
  var indices_start = uniforms.last_index_dimension * global_idx;
  var indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${Gn(r.length,!0)}
  }
  ${jn(t,y.type.value,!0)}
  }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}),getShaderSource:p}},Pd=e=>g({reduction:e.reduction}),Ud=(e,t)=>{e.compute(Dd(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Nd,Ld,qd,Hn,Vd,Fd,Wd,Gd,jd,Hd,Kd,Zd,Kn,Qd,Xd,Yd,Jd,ep,tp,rp,of=E(()=>{be(),he(),b(),de(),Nd=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Ld=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let i=new Array(r).fill(1);return t.forEach((a,n)=>i[a]=e[n]),i},qd=(e,t,r,i,a,n)=>{let[s,o,u]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(d=>n.push(d));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(o>0&&e.length>o&&e[o].dims.length===1&&e[o].dims[0]>0){if(e[o].getFloat32Array().forEach(d=>i.push(d)),i.length!==0&&i.length!==l&&r>=18&&i.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Nd(i,t),t.axes.length>0&&Ld(i,t.axes,l).forEach((d,p)=>i[p]=d)}if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0&&(e[u].getBigInt64Array().forEach(d=>a.push(Number(d))),a.length!==0&&a.length!==l&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(i.length!==0&&i.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof i<"u"&&typeof a<"u"&&i.length>0&&a.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},Hn=(e,t,r,i)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${i}(big / (${r}));
  let fract = ${i}(big % (${r})) / ${i}(${r});
  return whole + fract;
`,Vd=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${Hn("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${Hn("xResized","lengthOriginal - 1","lengthResized - 1",t)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",Fd=(e,t,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",Wd=(e,t,r)=>{let i=new Array(r).fill(0).concat(new Array(r).fill(1)),a=e.length===0?i:e.slice();return t.length>0?(t.forEach((n,s)=>{i[n]=a[s],i[s+r]=a[t.length+s]}),i):a},Gd=(e,t,r,i)=>{let a=[];if(r.length>0)if(i.length>0){if(e.forEach(n=>a.push(n)),Math.max(...i)>e.length)throw new Error("axes is out of bound");i.forEach((n,s)=>a[n]=r[s])}else r.forEach(n=>a.push(n));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");a=e.map((n,s)=>Math.round(n*t[s]))}return a},jd=(e,t,r)=>{let i=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(n=>t[n]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(n=>t[n]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let a=e.slice();return r.axes.length>0?(r.axes.forEach(n=>t[n]=i),r.axes.forEach(n=>a[n]=Math.round(e[n]*t[n]))):(t.fill(i,0,t.length),a.forEach((n,s)=>a[s]=Math.round(n*t[s]))),a},Hd=(e,t,r,i,a)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${r.length}> {
      var original_indices: array<${e.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${U("uniforms.scales","i",i)};
        var roi_low = ${U("uniforms.roi","i",a)};
        var roi_hi = ${U("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${U("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${U("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Kd=(e,t,r,i,a,n,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${U("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${U("uniforms.roi","i",n)};
          var roi_hi = ${U("uniforms.roi",`i + ${r.length}`,n)};
          var input_shape_i = ${U("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${U("uniforms.output_shape","i",i.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${s} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,Zd=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${U("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,Kn=(e,t,r,i)=>e.rank>i?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",r,"batch")};
`:"",Qd=(e,t,r,i,a)=>{let[n,s,o,u]=r.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(row, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(col, ${r[o]} - 1))`)};
      ${Kn(e,u,n,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${l} = originalIndices[${s}];
      var col:${l} = originalIndices[${o}];
      ${i?`if (row < 0 || row > (${r[s]} - 1) || col < 0 || col > (${r[o]} - 1)) {
        return ${a};
      }`:""};
      row = max(0, min(row, ${r[s]} - 1));
      col = max(0, min(col, ${r[o]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${r.length>2?`u32(originalIndices[${u}])`:"0"};
      var batch: u32 =  ${r.length>2?`u32(originalIndices[${n}])`:"0"};
      var x11: ${l} = getInputValue(batch, channel, row1, col1);
      var x12: ${l} = getInputValue(batch, channel, row1, col2);
      var x21: ${l} = getInputValue(batch, channel, row2, col1);
      var x22: ${l} = getInputValue(batch, channel, row2, col2);
      var dx1: ${l} = abs(row - ${l}(row1));
      var dx2: ${l} = abs(${l}(row2) - row);
      var dy1: ${l} = abs(col - ${l}(col1));
      var dy2: ${l} = abs(${l}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Xd=(e,t,r,i,a,n,s,o,u,l)=>{let d=r.length===2,[p,f]=d?[0,1]:[2,3],h=e.type.value,m=y=>{let $=y===p?"row":"col";return`
      fn ${$}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${h} {
        var output_index = ${t.indicesGet("output_indices",y)};
        var originalIdx: ${h} = getOriginalCoordinateFromResizedCoordinate(output_index, ${a[y]},
        ${i[y]}, ${r[y]}, ${n[y]}, ${n[y]} + ${r.length});
        var fractOriginalIdx: ${h} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${o} && (originalIdx < 0 || originalIdx > (${r[y]} - 1))) {
          return ${u};
        }
        var data: array<${h}, 4> = array<${h}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${$}: ${h} = originalIdx + ${h}(i);
          if (${$} < 0 || ${$} >= ${r[y]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:o?`return ${u};`:`${$} = max(0, min(${$}, ${r[y]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",y,`u32(${$})`)};
          data[i + 1] = ${y===p?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${m(p)};
    ${m(f)};
  fn getCubicInterpolationCoefs(s: ${h}) -> array<${h}, 4> {
    var absS = abs(s);
    var coeffs: array<${h}, 4> = array<${h}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${h} = 1.0 - absS;
    var twoMinusAbsS: ${h} = 2.0 - absS;
    var onePlusAbsS: ${h} = 1.0 + absS;
    coeffs[0] = ((${s} * onePlusAbsS - 5 * ${s}) * onePlusAbsS + 8 * ${s}) * onePlusAbsS - 4 * ${s};
    coeffs[1] = ((${s} + 2) * absS - (${s} + 3)) * absS * absS + 1;
    coeffs[2] = ((${s} + 2) * oneMinusAbsS - (${s} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${s} * twoMinusAbsS - 5 * ${s}) * twoMinusAbsS + 8 * ${s}) * twoMinusAbsS - 4 * ${s};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${h}, 4>, coefs: array<${h}, 4>) -> ${h} {
    var coefsSum: ${h} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${h} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},Yd=(e,t,r,i,a)=>{let[n,s,o,u,l]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],d=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${d} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(depth, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(height, ${r[o]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(width, ${r[u]} - 1))`)};
      ${Kn(e,l,n,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${d} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${d} = originalIndices[${s}];
      var height:${d} = originalIndices[${o}];
      var width:${d} = originalIndices[${u}];
      ${i?`if (depth < 0 || depth > (${r[s]} - 1) || height < 0 || height > (${r[o]} - 1) || width < 0 || (width > ${r[u]} - 1)) {
      return ${a};
        }`:""};

    depth = max(0, min(depth, ${r[s]} - 1));
      height = max(0, min(height, ${r[o]} - 1));
      width = max(0, min(width, ${r[u]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${r.length>3?`u32(originalIndices[${l}])`:"0"};
      var batch: u32 =  ${r.length>3?`u32(originalIndices[${n}])`:"0"};

      var x111: ${d} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${d} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${d} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${d} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${d} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${d} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${d} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${d} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${d} = abs(depth - ${d}(depth1));
      var dx2: ${d} = abs(${d}(depth2) - depth);
      var dy1: ${d} = abs(height - ${d}(height1));
      var dy2: ${d} = abs(${d}(height2) - height);
      var dz1: ${d} = abs(width - ${d}(width1));
      var dz2: ${d} = abs(${d}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},Jd=(e,t,r,i,a,n)=>{let s=e.dims,o=Wd(n,t.axes,s.length),u=Gd(s,i,a,t.axes),l=i.slice();i.length===0&&(l=s.map((_,T)=>_===0?1:u[T]/_),t.keepAspectRatioPolicy!=="stretch"&&(u=jd(s,l,t)));let d=Z("output",e.dataType,u.length),p=A("input",e.dataType,s.length),f=N.size(u),h=s.length===u.length&&s.every((_,T)=>_===u[T]),m=t.coordinateTransformMode==="tf_crop_and_resize",y=t.extrapolationValue,$=p.type.value,w=_=>`
      ${h?"":`
      ${Vd(t.coordinateTransformMode,$)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Zd(p,s)};
              ${Fd(t.nearestMode,r,$)};
              ${Kd(p,d,s,u,l.length,o.length,m)};
              `;case"linear":return`
              ${Hd(d,s,u,l.length,o.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${Qd(p,d,s,m,y)}`;if(s.length===3||s.length===5)return`${Yd(p,d,s,m,y)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${Xd(p,d,s,u,l,o,t.cubicCoeffA,m,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${_.registerUniform("output_size","u32").registerUniform("scales","f32",l.length).registerUniform("roi","f32",o.length).declareVariables(p,d)}
      ${_.mainStart()}
        ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${h?"output[global_idx] = input[global_idx];":`
        let output_indices = ${d.offsetToIndices("global_idx")};
        var input_indices: ${p.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${p.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${s.length===2||s.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${l.length>0?t.mode==="cubic"?l:l.length:""}|${a.length>0?a:""}|${o.length>0?o:""}|${h}|${t.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:u,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},{type:1,data:l},{type:1,data:o},...k(s,u)]})}},ep=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},tp=(e,t)=>{let r=[],i=[],a=[],n=ep(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");qd(e.inputs,t,n,r,i,a),e.compute(Jd(e.inputs[0],t,n,r,i,a),{inputs:[0]})},rp=e=>{let t=e.antialias,r=e.axes,i=e.coordinateTransformMode,a=e.cubicCoeffA,n=e.excludeOutside!==0,s=e.extrapolationValue,o=e.keepAspectRatioPolicy,u=e.mode,l=e.nearestMode===""?"simple":e.nearestMode;return g({antialias:t,axes:r,coordinateTransformMode:i,cubicCoeffA:a,excludeOutside:n,extrapolationValue:s,keepAspectRatioPolicy:o,mode:u,nearestMode:l})}}),ip,ap,np,uf=E(()=>{be(),he(),de(),ip=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],i=e[2];if(t.dataType!==r.dataType||t.dataType!==i.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],n=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==n)throw new Error("Skip must have the same sequence length as input");if(i.dims.length!==1)throw new Error("Gamma must be 1D");if(i.dims[i.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},ap=(e,t,r,i)=>{let a=t.simplified,n=e[0].dims,s=N.size(n),o=n,u=s,l=n.slice(-1)[0],d=i?n.slice(0,-1).concat(1):[],p=!a&&e.length>3,f=e.length>4,h=i&&r>1,m=i&&r>2,y=r>3,$=64,w=M(l),_=[{type:12,data:u},{type:12,data:w},{type:12,data:l},{type:1,data:t.epsilon}],T=z=>{let P=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],B=[A("x",e[0].dataType,e[0].dims,w),A("skip",e[1].dataType,e[1].dims,w),A("gamma",e[2].dataType,e[2].dims,w)];p&&B.push(A("beta",e[3].dataType,e[3].dims,w)),f&&B.push(A("bias",e[4].dataType,e[4].dims,w)),B.push(Z("output",e[0].dataType,o,w)),h&&B.push(Z("mean_output",1,d)),m&&B.push(Z("inv_std_output",1,d)),y&&B.push(Z("input_skip_bias_sum",e[0].dataType,o,w));let L=R(e[0].dataType),V=R(1,w);return`

      ${z.registerUniforms(P).declareVariables(...B)}
      var<workgroup> sum_shared : array<${V}, ${$}>;
      var<workgroup> sum_squared_shared : array<${V}, ${$}>;

      ${z.mainStart([$,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${$};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${$};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${$-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${f?"bias[offset1d + i]":L+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${y?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${j(L,w,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${$};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${K("sum",w)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${K("square_sum",w)} / f32(uniforms.hidden_size) ${a?"":"- mean * mean"} + uniforms.epsilon);
        ${h?"mean_output[global_idx] = mean;":""}
        ${m?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${a?"":`- ${L}(mean)`}) *
            ${L}(inv_std_dev) * gamma[offset1d + i]
            ${p?"+ beta[offset1d + i]":""};
        }
      }`},x=[{dims:o,dataType:e[0].dataType}];return r>1&&x.push({dims:d,dataType:1}),r>2&&x.push({dims:d,dataType:1}),r>3&&x.push({dims:n,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${w};${h};${m};${y}`,inputDependencies:e.map((z,P)=>"type")},getShaderSource:T,getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(u/l)},programUniforms:_})}},np=(e,t)=>{ip(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(ap(e.inputs,t,e.outputCount,!1),{outputs:r})}}),sp,ya,op,Zn,up,lp,dp,pp,lf=E(()=>{be(),he(),b(),de(),sp=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,i)=>{if(e[i+1].dataType!==6&&e[i+1].dataType!==7)throw new Error(`Input ${i} must be an array of int32 or int64`)})},ya=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(i=>r.push(Number(i)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(i=>r.push(Number(i)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},op=(e,t)=>{if(e.length>1){let r=ya(e,1),i=ya(e,2),a=ya(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),g({starts:r,ends:i,axes:a})}else return t},Zn=(e,t,r,i,a)=>{let n=e;return e<0&&(n+=r[i[t]]),a[t]<0?Math.max(0,Math.min(n,r[i[t]]-1)):Math.max(0,Math.min(n,r[i[t]]))},up=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length}; i >= 0; i--) {
            let input_shape_i = ${U("uniforms.input_shape","i",r.length)};
            let steps_i = ${U("uniforms.steps","i",r.length)};
            let signs_i = ${U("uniforms.signs","i",r.length)};
            let starts_i = ${U("uniforms.starts","i",r.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,lp=(e,t)=>{let r=e[0].dims,i=N.size(r),a=t.axes.length>0?N.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],n=ya(e,4);n.forEach(w=>w!==0||(()=>{throw new Error("step cannot be 0")})),n.length===0&&(n=Array(a.length).fill(1));let s=t.starts.map((w,_)=>Zn(w,_,r,a,n)),o=t.ends.map((w,_)=>Zn(w,_,r,a,n));if(a.length!==s.length||a.length!==o.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let w=0;w<r.length;++w)a.includes(w)||(s.splice(w,0,0),o.splice(w,0,r[w]),n.splice(w,0,1));let u=n.map(w=>Math.sign(w));n.forEach((w,_,T)=>{if(w<0){let x=(o[_]-s[_])/w,z=s[_],P=z+x*n[_];s[_]=P,o[_]=z,T[_]=-w}});let l=r.slice(0);a.forEach((w,_)=>{l[w]=Math.ceil((o[w]-s[w])/n[w])});let d={dims:l,dataType:e[0].dataType},p=Z("output",e[0].dataType,l.length),f=A("input",e[0].dataType,e[0].dims.length),h=N.size(l),m=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:n.length}],y=[{type:12,data:h},{type:12,data:s},{type:6,data:u},{type:12,data:n},...k(e[0].dims,l)],$=w=>`
      ${w.registerUniforms(m).declareVariables(f,p)}
        ${up(f,p,r)}
        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${p.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${p.setByOffset("global_idx",f.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${s.length}_${n.length}`,inputDependencies:["rank"]},getShaderSource:$,getRunData:()=>({outputs:[d],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:y})}},dp=(e,t)=>{sp(e.inputs,t);let r=op(e.inputs,t);e.compute(lp(e.inputs,r),{inputs:[0]})},pp=e=>{let t=e.starts,r=e.ends,i=e.axes;return g({starts:t,ends:r,axes:i})}}),cp,fp,hp,mp,df=E(()=>{be(),he(),b(),ht(),de(),cp=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},fp=(e,t)=>{let r=e.inputs[0],i=r.dims,a=N.size(i),n=i.length,s=N.normalizeAxis(t.axis,n),o=s<i.length-1,u,l=[];o?(l=Array.from({length:n},(B,L)=>L),l[s]=n-1,l[n-1]=s,u=e.compute(bt(r,l),{inputs:[r],outputs:[-1]})[0]):u=r;let d=u.dims,p=d[n-1],f=a/p,h=M(p),m=p/h,y=64;f===1&&(y=256);let $=(B,L)=>L===4?`max(max(${B}.x, ${B}.y), max(${B}.z, ${B}.w))`:L===2?`max(${B}.x, ${B}.y)`:L===3?`max(max(${B}.x, ${B}.y), ${B}.z)`:B,w=A("x",u.dataType,u.dims,h),_=Z("result",u.dataType,u.dims,h),T=w.type.value,x=R(u.dataType)==="f32"?`var threadMax = ${T}(-3.402823e+38f);`:`var threadMax = ${T}(-65504.0h);`,z=B=>`
      var<workgroup> rowMaxShared : ${T};
      var<workgroup> rowSumShared : ${T};
      var<workgroup> threadShared : array<${T}, ${y}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${T} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${T}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${B.registerUniform("packedCols","i32").declareVariables(w,_)}
      ${B.mainStart(y)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${y};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${x}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${T}(${$("threadShared[0]",h)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${T}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${T}(${K("threadShared[0]",h)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`,P=e.compute({name:"Softmax",shaderCache:{hint:`${h};${y}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:d,dataType:u.dataType}],dispatchGroup:{x:f},programUniforms:[{type:6,data:m}]}),getShaderSource:z},{inputs:[u],outputs:[o?-1:0]})[0];o&&e.compute(bt(P,l),{inputs:[P]})},hp=(e,t)=>{cp(e.inputs),fp(e,t)},mp=e=>g({axis:e.axis})}),Qn,gp,yp,_p,wp,pf=E(()=>{be(),he(),de(),Qn=e=>Array.from(e.getBigInt64Array(),Number),gp=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Qn(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},yp=(e,t)=>{let r=[];for(let i=0;i<e.length;++i)r.push(e[i]*t[i]);return r},_p=(e,t)=>{let r=e[0].dims,i=t??Qn(e[1]),a=yp(r,i),n=N.size(a),s=e[0].dataType,o=A("input",s,r.length),u=Z("output",s,a.length),l=d=>`
      const inputShape = ${o.indices(...r)};
      ${d.registerUniform("output_size","u32").declareVariables(o,u)}
      ${d.mainStart()}
      ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${u.offsetToIndices("global_idx")};
      var input_indices: ${o.type.indices};
      for (var i = 0; i < ${r.length}; i++) {
        let input_dim_i = ${o.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${u.indicesGet("output_indices","i")}  % input_dim_i;

        ${o.indicesSet("input_indices","i","input_dim_value")}
      }
      ${u.setByOffset("global_idx",o.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${i}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:[{type:12,data:n},...k(e[0].dims,a)]}),getShaderSource:l}},wp=e=>{gp(e.inputs),e.compute(_p(e.inputs),{inputs:[0]})}}),bp,$p,vp,cf=E(()=>{be(),he(),de(),bp=(e,t,r,i,a)=>{let n=Z("output_data",a,r.length,4),s=A("a_data",t[1].dataType,t[1].dims.length,4),o=A("b_data",t[2].dataType,t[2].dims.length,4),u=A("c_data",t[0].dataType,t[0].dims.length,4),l,d=(p,f,h)=>`select(${f}, ${p}, ${h})`;if(!i)l=n.setByOffset("global_idx",d(s.getByOffset("global_idx"),o.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let p=(f,h,m="")=>{let y=`a_data[index_a${h}][component_a${h}]`,$=`b_data[index_b${h}][component_b${h}]`,w=`bool(c_data[index_c${h}] & (0xffu << (component_c${h} * 8)))`;return`
            let output_indices${h} = ${n.offsetToIndices(`global_idx * 4u + ${h}u`)};
            let offset_a${h} = ${s.broadcastedIndicesToOffset(`output_indices${h}`,n)};
            let offset_b${h} = ${o.broadcastedIndicesToOffset(`output_indices${h}`,n)};
            let offset_c${h} = ${u.broadcastedIndicesToOffset(`output_indices${h}`,n)};
            let index_a${h} = offset_a${h} / 4u;
            let index_b${h} = offset_b${h} / 4u;
            let index_c${h} = offset_c${h} / 4u;
            let component_a${h} = offset_a${h} % 4u;
            let component_b${h} = offset_b${h} % 4u;
            let component_c${h} = offset_c${h} % 4u;
            ${f}[${h}] = ${m}(${d(y,$,w)});
          `};a===9?l=`
            var data = vec4<u32>(0);
            ${p("data",0,"u32")}
            ${p("data",1,"u32")}
            ${p("data",2,"u32")}
            ${p("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:l=`
            ${p("output_data[global_idx]",0)}
            ${p("output_data[global_idx]",1)}
            ${p("output_data[global_idx]",2)}
            ${p("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(u,s,o,n)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${l}
      }`},$p=e=>{let t=e[1].dims,r=e[2].dims,i=e[0].dims,a=e[1].dataType,n=!(N.areEqual(t,r)&&N.areEqual(r,i)),s=t,o=N.size(t);if(n){let l=tr.calcShape(tr.calcShape(t,r,!1),i,!1);if(!l)throw new Error("Can't perform where op on the given tensors");s=l,o=N.size(s)}let u=Math.ceil(o/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>bp(l,e,s,n,a),getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64/4)},programUniforms:[{type:12,data:u},...k(i,t,r,s)]})}},vp=e=>{e.compute($p(e.inputs))}}),xp,ff=E(()=>{Ec(),dn(),Ic(),kc(),Cc(),zc(),Ac(),Dc(),Uc(),Nc(),Lc(),qc(),Vc(),Fc(),Wc(),Gc(),jc(),Hc(),Kc(),Zc(),Qc(),Xc(),Yc(),Jc(),ef(),Bl(),tf(),rf(),af(),nf(),sf(),on(),of(),Gl(),uf(),lf(),df(),Vl(),pf(),ht(),hn(),cf(),xp=new Map([["Abs",[ro]],["Acos",[io]],["Acosh",[ao]],["Add",[jo]],["ArgMax",[qs,ln]],["ArgMin",[Ls,ln]],["Asin",[no]],["Asinh",[so]],["Atan",[oo]],["Atanh",[uo]],["Attention",[Hs]],["AveragePool",[$d,bd]],["BatchNormalization",[Xs]],["BiasAdd",[eo]],["BiasSplitGelu",[Fo]],["Cast",[po,lo]],["Ceil",[ho]],["Clip",[fo]],["Concat",[su,ou]],["Conv",[In,Tn]],["ConvTranspose",[Mu,Au]],["Cos",[mo]],["Cosh",[go]],["CumSum",[Du,Pu]],["DepthToSpace",[qu,Vu]],["DequantizeLinear",[zd,Ad]],["Div",[Ho]],["Einsum",[Ku,Zu]],["Elu",[yo,pa]],["Equal",[Ko]],["Erf",[_o]],["Exp",[wo]],["Expand",[Ju]],["FastGelu",[tl]],["Floor",[bo]],["FusedConv",[In,Tn]],["Gather",[nl,al]],["GatherElements",[gl,ml]],["GatherBlockQuantized",[pl,cl]],["GatherND",[ol,ul]],["Gelu",[$o]],["Gemm",[bl,wl]],["GlobalAveragePool",[xd,vd]],["GlobalMaxPool",[Id,Ed]],["Greater",[Yo]],["GreaterOrEqual",[eu]],["GridSample",[Cl,zl]],["GroupQueryAttention",[Zl]],["HardSigmoid",[Co,ko]],["InstanceNormalization",[Yl]],["LayerNormalization",[td]],["LeakyRelu",[vo,pa]],["Less",[Jo]],["LessOrEqual",[tu]],["Log",[Po]],["MatMul",[id]],["MatMulNBits",[od,ud]],["MaxPool",[Sd,Td]],["Mul",[Zo]],["MultiHeadAttention",[Ml,Ol]],["Neg",[So]],["Not",[xo]],["Pad",[yd]],["Pow",[Qo]],["QuickGelu",[Lo,pa]],["Range",[Md]],["Reciprocal",[To]],["ReduceMin",[Bs]],["ReduceMean",[zs]],["ReduceMax",[Ms]],["ReduceSum",[Ps]],["ReduceProd",[Ds]],["ReduceL1",[As]],["ReduceL2",[Os]],["ReduceLogSum",[Ns]],["ReduceLogSumExp",[Rs]],["ReduceSumSquare",[Us]],["Relu",[Eo]],["Resize",[tp,rp]],["RotaryEmbedding",[Wl]],["ScatterND",[Ud,Pd]],["Sigmoid",[Io]],["Sin",[zo]],["Sinh",[Ao]],["Slice",[dp,pp]],["SkipLayerNormalization",[np]],["Split",[Ll,ql]],["Sqrt",[Oo]],["Softmax",[hp,mp]],["Sub",[Xo]],["Tan",[Ro]],["Tanh",[Mo]],["ThresholdedRelu",[Do,pa]],["Tile",[wp]],["Transpose",[ua,Pt]],["Where",[vp]]])}),Sp,hf=E(()=>{ct(),Dt(),de(),Sp=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,i,a){lt(e.programInfo.name);let n=this.backend.device,s=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let o=[];for(let l of t)o.push({binding:o.length,resource:{buffer:l.buffer}});for(let l of r)o.push({binding:o.length,resource:{buffer:l.buffer}});a&&o.push({binding:o.length,resource:a});let u=n.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:o,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let l={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:u,dispatchGroup:i};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(l)}s.setPipeline(e.computePipeline),s.setBindGroup(0,u),s.dispatchWorkgroups(...i),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),ot(e.programInfo.name)}dispose(){}build(e,t){lt(e.name);let r=this.backend.device,i=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(l=>{r.features.has(l.feature)&&i.push(`enable ${l.extension};`)});let a=He(t,this.backend.device.limits),n=e.getShaderSource(a),s=`${i.join(`
`)}
${a.additionalImplementations}
${n}`,o=r.createShaderModule({code:s,label:e.name});Me("verbose",()=>`[WebGPU] ${e.name} shader code: ${s}`);let u=r.createComputePipeline({compute:{module:o,entryPoint:"main"},layout:"auto",label:e.name});return ot(e.name),{programInfo:e,computePipeline:u,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,i=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&i<=a)return[t,r,i];let n=t*r*i,s=Math.ceil(Math.sqrt(n));if(s>a){if(s=Math.ceil(Math.cbrt(n)),s>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[s,s,s]}else return[s,s,1]}}}),Tp={};ce(Tp,{WebGpuBackend:()=>Cp});var Ep,Ip,kp,Cp,mf=E(()=>{ct(),be(),Dt(),yr(),nn(),ff(),hf(),Ep=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let i=0;i<e.length;++i){let a=e[i].dataType;switch(t[i]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let n=e[i].dims.length;r.push(`${a};${n}`);break}case"dims":{let n=e[i].dims.join(",");r.push(`${a};${n}`);break}default:throw new Error(`unsupported input dependency: ${t[i]}`)}}return r.join("|")},Ip=(e,t,r)=>{var a,n;let i=e.name;return(a=e.shaderCache)!=null&&a.hint&&(i+="["+e.shaderCache.hint+"]"),i+=":"+r+`:${Ep(t,((n=e.shaderCache)==null?void 0:n.inputDependencies)??new Array(t.length).fill("dims"))}`,i},kp=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Cp=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],i={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r},a=n=>t.features.has(n)&&r.push(n)&&!0;a("chromium-experimental-timestamp-query-inside-passes")||a("timestamp-query"),a("shader-f16"),a("subgroups"),this.device=await t.requestDevice(i),this.adapterInfo=new kp(t.info||await t.requestAdapterInfo()),this.gpuDataManager=Ia(this),this.programManager=new Sp(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,fi(e.logLevel,!!e.debug),this.device.onuncapturederror=n=>{n.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${n.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;lt(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var i;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let n=r[a],s=n.kernelId,o=this.kernels.get(s),u=o.kernelType,l=o.kernelName,d=n.programName,p=n.inputTensorViews,f=n.outputTensorViews,h=t[a*2],m=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=h);let y=Number(h-this.queryTimeBase),$=Number(m-this.queryTimeBase);if(!Number.isSafeInteger(y)||!Number.isSafeInteger($))throw new RangeError("incorrect timestamp range");if((i=this.env.webgpu.profiling)!=null&&i.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:p.map(w=>({dims:w.dims,dataType:At(w.dataType)})),outputsMetadata:f.map(w=>({dims:w.dims,dataType:At(w.dataType)})),kernelId:s,kernelType:u,kernelName:l,programName:d,startTime:y,endTime:$});else{let w="";p.forEach((T,x)=>{w+=`input[${x}]: [${T.dims}] | ${At(T.dataType)}, `});let _="";f.forEach((T,x)=>{_+=`output[${x}]: [${T.dims}] | ${At(T.dataType)}, `}),console.log(`[profiling] kernel "${s}|${u}|${l}|${d}" ${w}${_}execution time: ${$-y} ns`)}Jt("GPU",`${d}::${h}::${m}`)}e.unmap(),this.pendingQueries.delete(e)}),ot()}run(e,t,r,i,a,n){lt(e.name);let s=[];for(let _=0;_<t.length;++_){let T=t[_].data;if(T===0)continue;let x=this.gpuDataManager.get(T);if(!x)throw new Error(`no GPU data for input: ${T}`);s.push(x)}let{outputs:o,dispatchGroup:u,programUniforms:l}=e.getRunData(t),d=r.length===0?o.map((_,T)=>T):r;if(d.length!==o.length)throw new Error(`Output size ${d.length} must be equal to ${o.length}.`);let p=[],f=[];for(let _=0;_<o.length;++_){if(!Number.isInteger(d[_])||d[_]<-3||d[_]>=n)throw new Error(`Invalid output index: ${d[_]}`);if(d[_]===-3)continue;let T=d[_]===-1,x=d[_]===-2,z=T||x?a(o[_].dataType,o[_].dims):i(d[_],o[_].dataType,o[_].dims);if(p.push(z),z.data===0)continue;let P=this.gpuDataManager.get(z.data);if(!P)throw new Error(`no GPU data for output: ${z.data}`);if(T&&this.temporaryData.push(P),x){let B=this.kernelPersistentData.get(this.currentKernelId);B||(B=[],this.kernelPersistentData.set(this.currentKernelId,B)),B.push(P)}f.push(P)}if(s.length!==t.length||f.length!==p.length){if(f.length===0)return ot(e.name),p;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let h;if(l){let _=0,T=[];l.forEach(B=>{let L=typeof B.data=="number"?[B.data]:B.data;if(L.length===0)return;let V=B.type===10?2:4,J,we;B.type===10?(we=L.length>4?16:L.length>2?8:L.length*V,J=L.length>4?16:V*L.length):(we=L.length<=2?L.length*V:16,J=16),_=Math.ceil(_/we)*we,T.push(_);let oe=B.type===10?8:4;_+=L.length>4?Math.ceil(L.length/oe)*J:L.length*V});let x=16;_=Math.ceil(_/x)*x;let z=new ArrayBuffer(_);l.forEach((B,L)=>{let V=T[L],J=typeof B.data=="number"?[B.data]:B.data;if(B.type===6)new Int32Array(z,V,J.length).set(J);else if(B.type===12)new Uint32Array(z,V,J.length).set(J);else if(B.type===10)new Uint16Array(z,V,J.length).set(J);else if(B.type===1)new Float32Array(z,V,J.length).set(J);else throw new Error(`Unsupported uniform type: ${At(B.type)}`)});let P=this.gpuDataManager.create(_,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(P.buffer,0,z,0,_),this.gpuDataManager.release(P.id),h={offset:0,size:_,buffer:P.buffer}}let m=this.programManager.normalizeDispatchGroupSize(u),y=m[1]===1&&m[2]===1,$=Ip(e,t,y),w=this.programManager.getArtifact($);if(w||(w=this.programManager.build(e,m),this.programManager.setArtifact($,w),Me("info",()=>`[artifact] key: ${$}, programName: ${e.name}`)),l&&w.uniformVariablesInfo){if(l.length!==w.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${w.uniformVariablesInfo.length}, got ${l.length} in program "${w.programInfo.name}".`);for(let _=0;_<l.length;_++){let T=l[_],x=T.type,z=typeof T.data=="number"?1:T.data.length,[P,B]=w.uniformVariablesInfo[_];if(x!==P||z!==B)throw new Error(`Uniform variable ${_} mismatch: expect type ${P} with size ${B}, got type ${x} with size ${z} in program "${w.programInfo.name}".`)}}if(Me("info",()=>`[ProgramManager] run "${e.name}" (key=${$}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let _={kernelId:this.currentKernelId,programName:w.programInfo.name,inputTensorViews:t,outputTensorViews:p};this.pendingKernels.push(_),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(_)}return this.programManager.run(w,s,f,m,h),ot(e.name),p}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,i){let a=xp.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let n={kernelType:e,kernelName:i,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,n)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let i=this.kernels.get(e);if(!i)throw new Error(`kernel not created: ${e}`);let a=i.kernelType,n=i.kernelName,s=i.kernelEntry,o=i.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${n}" is not allowed to be called recursively`);this.currentKernelId=e,o[0]&&(o[1]=o[0](o[1]),o[0]=void 0),Me("info",()=>`[WebGPU] Start to run kernel "[${a}] ${n}"...`);let u=this.env.debug;this.temporaryData=[];try{return u&&this.device.pushErrorScope("validation"),s(t,o[1]),0}catch(l){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${n}" failed. ${l}`)),1}finally{u&&r.push(this.device.popErrorScope().then(l=>l?`GPU validation error for kernel "[${a}] ${n}": ${l.message}`:null));for(let l of this.temporaryData)this.gpuDataManager.release(l.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,i){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let n=a.get(t),s=this.gpuDataManager.registerExternalBuffer(r,i,n);return a.set(t,[s,r]),s}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let i=await sa(this,e,t);return rr(i.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){Me("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){Me("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){Me("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let i=0;i<r;i++){let a=this.getComputePassEncoder(),n=e[i];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(n.computePipeline),a.setBindGroup(0,n.bindGroup),a.dispatchWorkgroups(...n.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[i]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),zp={};ce(zp,{init:()=>Op});var La,Ap,Op,gf=E(()=>{be(),Dt(),he(),na(),La=class gc{constructor(t,r,i,a){this.module=t,this.dataType=r,this.data=i,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=N.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=N.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=N.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=N.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(N.size(t)!==N.size(this.dims))throw new Error("Invalid new shape");return new gc(this.module,this.dataType,this.data,t)}},Ap=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let i=e.PTR_SIZE,a=r/e.PTR_SIZE,n=i===4?"i32":"i64";this.opKernelContext=Number(e.getValue(i*a++,n));let s=Number(e.getValue(i*a++,n));this.outputCount=Number(e.getValue(i*a++,n)),this.customDataOffset=Number(e.getValue(i*a++,"*")),this.customDataSize=Number(e.getValue(i*a++,n));let o=[];for(let u=0;u<s;u++){let l=Number(e.getValue(i*a++,n)),d=Number(e.getValue(i*a++,"*")),p=Number(e.getValue(i*a++,n)),f=[];for(let h=0;h<p;h++)f.push(Number(e.getValue(i*a++,n)));o.push(new La(e,l,d,f))}this.inputs=o}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var s;let r=((s=t==null?void 0:t.inputs)==null?void 0:s.map(o=>typeof o=="number"?this.inputs[o]:o))??this.inputs,i=(t==null?void 0:t.outputs)??[],a=(o,u,l)=>new La(this.module,u,this.output(o,l),l),n=(o,u)=>{let l=Ot(o,u);if(!l)throw new Error(`Unsupported data type: ${o}`);let d=l>0?this.backend.gpuDataManager.create(l).id:0;return new La(this.module,o,d,u)};return this.backend.run(e,r,i,a,n,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let i=this.module.PTR_SIZE,a=i===4?"i32":"i64",n=this.module.stackAlloc((1+t.length)*i);this.module.setValue(n,t.length,a);for(let s=0;s<t.length;s++)this.module.setValue(n+i*(s+1),t[s],a);return this.module._JsepOutput(this.opKernelContext,e,n)}catch(i){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${i}`)}finally{this.module.stackRestore(r)}}},Op=async(e,t,r,i)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let n=(mf(),Ee(Tp)).WebGpuBackend,s=new n;await s.initialize(r,i),a("webgpu",[s,o=>s.alloc(Number(o)),o=>s.free(o),(o,u,l,d=!1)=>{if(d)Me("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(o)}, dst=${Number(u)}, size=${Number(l)}`),s.memcpy(Number(o),Number(u));else{Me("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(o)}, gpuDataId=${Number(u)}, size=${Number(l)}`);let p=t.HEAPU8.subarray(Number(o>>>0),Number(o>>>0)+Number(l));s.upload(Number(u),p)}},async(o,u,l)=>{Me("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${o}, dataOffset=${u}, size=${l}`),await s.download(Number(o),()=>t.HEAPU8.subarray(Number(u)>>>0,Number(u+l)>>>0))},(o,u,l)=>s.createKernel(o,Number(u),l,t.UTF8ToString(t._JsepGetNodeName(Number(u)))),o=>s.releaseKernel(o),(o,u,l,d)=>{Me("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${o}, contextDataOffset=${u}`);let p=new Ap(t,s,Number(u));return s.computeKernel(Number(o),p,d)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let n=new aa(r);a("webnn",[n,()=>n.reserveTensorId(),s=>n.releaseTensorId(s),async(s,o,u,l,d)=>n.ensureTensor(s,o,u,l,d),(s,o)=>{n.uploadTensor(s,o)},async(s,o)=>n.downloadTensor(s,o)])}}}),Rp,Xn,Yn,$r,Mp,Jn,qa,es,ts,rs,is,as,ns,Bp=E(()=>{rn(),an(),be(),Ct(),Lr(),Yi(),Rp=(e,t)=>{Se()._OrtInit(e,t)!==0&&_e("Can't initialize onnxruntime.")},Xn=async e=>{Rp(e.wasm.numThreads,Vr(e.logLevel))},Yn=async(e,t)=>{var r,i;(i=(r=Se()).asyncInit)==null||i.call(r);{let a=(gf(),Ee(zp)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let n=e.webgpu.adapter;if(n){if(typeof n.limits!="object"||typeof n.features!="object"||typeof n.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let s=e.webgpu.powerPreference;if(s!==void 0&&s!=="low-power"&&s!=="high-performance")throw new Error(`Invalid powerPreference setting: "${s}"`);let o=e.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:s,forceFallbackAdapter:o}),!n)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await a("webgpu",Se(),e,n)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await a("webnn",Se(),e)}}},$r=new Map,Mp=e=>{let t=Se(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetInputOutputCount(e,a,a+i)!==0&&_e("Can't get session input/output count.");let n=i===4?"i32":"i64";return[Number(t.getValue(a,n)),Number(t.getValue(a+i,n))]}finally{t.stackRestore(r)}},Jn=(e,t)=>{let r=Se(),i=r.stackSave(),a=0;try{let n=r.PTR_SIZE,s=r.stackAlloc(2*n);r._OrtGetInputOutputMetadata(e,t,s,s+n)!==0&&_e("Can't get session input/output metadata.");let o=Number(r.getValue(s,"*"));a=Number(r.getValue(s+n,"*"));let u=r.HEAP32[a/4];if(u===0)return[o,0];let l=r.HEAPU32[a/4+1],d=[];for(let p=0;p<l;p++){let f=Number(r.getValue(a+8+p*n,"*"));d.push(f!==0?r.UTF8ToString(f):Number(r.getValue(a+8+(p+l)*n,"*")))}return[o,u,d]}finally{r.stackRestore(i),a!==0&&r._OrtFree(a)}},qa=e=>{let t=Se(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},es=async(e,t)=>{var p,f,h,m;let r,i,a=Se();Array.isArray(e)?[r,i]=e:e.buffer===a.HEAPU8.buffer?[r,i]=[e.byteOffset,e.byteLength]:[r,i]=qa(e);let n=0,s=0,o=0,u=[],l=[],d=[];try{if([s,u]=await Xi(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let L=[];for(let V of t.externalData){let J=typeof V=="string"?V:V.path;L.push(Gr(typeof V=="string"?V:V.data).then(we=>{a.mountExternalData(J,we)}))}await Promise.all(L)}for(let L of(t==null?void 0:t.executionProviders)??[])if((typeof L=="string"?L:L.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,typeof L!="string"){let V=L,J=V==null?void 0:V.context,we=V==null?void 0:V.gpuDevice,oe=V==null?void 0:V.deviceType,ye=V==null?void 0:V.powerPreference;J?a.currentContext=J:we?a.currentContext=await a.webnnCreateMLContext(we):a.currentContext=await a.webnnCreateMLContext({deviceType:oe,powerPreference:ye})}else a.currentContext=await a.webnnCreateMLContext();break}n=await a._OrtCreateSession(r,i,s),(p=a.webgpuOnCreateSession)==null||p.call(a,n),n===0&&_e("Can't create a session."),(f=a.jsepOnCreateSession)==null||f.call(a),a.currentContext&&(a.webnnRegisterMLContext(n,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[y,$]=Mp(n),w=!!(t!=null&&t.enableGraphCapture),_=[],T=[],x=[],z=[],P=[];for(let L=0;L<y;L++){let[V,J,we]=Jn(n,L);V===0&&_e("Can't get an input name."),l.push(V);let oe=a.UTF8ToString(V);_.push(oe),x.push(J===0?{name:oe,isTensor:!1}:{name:oe,isTensor:!0,type:At(J),shape:we})}for(let L=0;L<$;L++){let[V,J,we]=Jn(n,L+y);V===0&&_e("Can't get an output name."),d.push(V);let oe=a.UTF8ToString(V);T.push(oe),z.push(J===0?{name:oe,isTensor:!1}:{name:oe,isTensor:!0,type:At(J),shape:we});{if(w&&(t==null?void 0:t.preferredOutputLocation)===void 0){P.push("gpu-buffer");continue}let ye=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((h=t==null?void 0:t.preferredOutputLocation)==null?void 0:h[oe])??"cpu",Ue=a.webnnIsGraphOutput;if(ye==="cpu"&&Ue&&Ue(n,oe)){P.push("ml-tensor-cpu-output");continue}if(ye!=="cpu"&&ye!=="cpu-pinned"&&ye!=="gpu-buffer"&&ye!=="ml-tensor")throw new Error(`Not supported preferred output location: ${ye}.`);if(w&&ye!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${ye}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);P.push(ye)}}let B=null;return P.some(L=>L==="gpu-buffer"||L==="ml-tensor"||L==="ml-tensor-cpu-output")&&(o=a._OrtCreateBinding(n),o===0&&_e("Can't create IO binding."),B={handle:o,outputPreferredLocations:P,outputPreferredLocationsEncoded:P.map(L=>L==="ml-tensor-cpu-output"?"ml-tensor":L).map(L=>di(L))}),$r.set(n,[n,l,d,B,w,!1]),[n,_,T,x,z]}catch(y){throw l.forEach($=>a._OrtFree($)),d.forEach($=>a._OrtFree($)),o!==0&&a._OrtReleaseBinding(o)!==0&&_e("Can't release IO binding."),n!==0&&a._OrtReleaseSession(n)!==0&&_e("Can't release session."),y}finally{a._free(r),s!==0&&a._OrtReleaseSessionOptions(s)!==0&&_e("Can't release session options."),u.forEach(y=>a._free(y)),(m=a.unmountExternalData)==null||m.call(a)}},ts=e=>{var u,l,d;let t=Se(),r=$r.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[i,a,n,s,o]=r;s&&(o&&t._OrtClearBoundOutputs(s.handle)!==0&&_e("Can't clear bound outputs."),t._OrtReleaseBinding(s.handle)!==0&&_e("Can't release IO binding.")),(u=t.jsepOnReleaseSession)==null||u.call(t,e),(l=t.webnnOnReleaseSession)==null||l.call(t,e),(d=t.webgpuOnReleaseSession)==null||d.call(t,e),a.forEach(p=>t._OrtFree(p)),n.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(i)!==0&&_e("Can't release session."),$r.delete(e)},rs=async(e,t,r,i,a,n,s=!1)=>{if(!e){t.push(0);return}let o=Se(),u=o.PTR_SIZE,l=e[0],d=e[1],p=e[3],f=p,h,m;if(l==="string"&&(p==="gpu-buffer"||p==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&p!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${n} when enableGraphCapture is true.`);if(p==="gpu-buffer"){let w=e[2].gpuBuffer;m=Ot(zt(l),d);{let _=o.jsepRegisterBuffer;if(!_)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');h=_(i,n,w,m)}}else if(p==="ml-tensor"){let w=e[2].mlTensor;m=Ot(zt(l),d);let _=o.webnnRegisterMLTensor;if(!_)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');h=_(i,w,zt(l),d)}else{let w=e[2];if(Array.isArray(w)){m=u*w.length,h=o._malloc(m),r.push(h);for(let _=0;_<w.length;_++){if(typeof w[_]!="string")throw new TypeError(`tensor data at index ${_} is not a string`);o.setValue(h+_*u,et(w[_],r),"*")}}else{let _=o.webnnIsGraphInput,T=o.webnnIsGraphOutput;if(l!=="string"&&_&&T){let x=o.UTF8ToString(a);if(_(i,x)||T(i,x)){let z=zt(l);m=Ot(z,d),f="ml-tensor";let P=o.webnnCreateTemporaryTensor,B=o.webnnUploadTensor;if(!P||!B)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let L=await P(i,z,d);B(L,new Uint8Array(w.buffer,w.byteOffset,w.byteLength)),h=L}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}}let y=o.stackSave(),$=o.stackAlloc(4*d.length);try{d.forEach((_,T)=>o.setValue($+T*u,_,u===4?"i32":"i64"));let w=o._OrtCreateTensor(zt(l),h,m,$,d.length,di(f));w===0&&_e(`Can't create tensor for input/output. session=${i}, index=${n}.`),t.push(w)}finally{o.stackRestore(y)}},is=async(e,t,r,i,a,n)=>{var we,oe,ye,Ue;let s=Se(),o=s.PTR_SIZE,u=$r.get(e);if(!u)throw new Error(`cannot run inference. invalid session id: ${e}`);let l=u[0],d=u[1],p=u[2],f=u[3],h=u[4],m=u[5],y=t.length,$=i.length,w=0,_=[],T=[],x=[],z=[],P=s.stackSave(),B=s.stackAlloc(y*o),L=s.stackAlloc(y*o),V=s.stackAlloc($*o),J=s.stackAlloc($*o);try{[w,_]=ji(n);for(let pe=0;pe<y;pe++)await rs(r[pe],T,z,e,d[t[pe]],t[pe],h);for(let pe=0;pe<$;pe++)await rs(a[pe],x,z,e,p[i[pe]],y+i[pe],h);for(let pe=0;pe<y;pe++)s.setValue(B+pe*o,T[pe],"*"),s.setValue(L+pe*o,d[t[pe]],"*");for(let pe=0;pe<$;pe++)s.setValue(V+pe*o,x[pe],"*"),s.setValue(J+pe*o,p[i[pe]],"*");if(f&&!m){let{handle:pe,outputPreferredLocations:Te,outputPreferredLocationsEncoded:_t}=f;if(d.length!==y)throw new Error(`input count from feeds (${y}) is expected to be always equal to model's input count (${d.length}).`);for(let G=0;G<y;G++){let te=t[G];await s._OrtBindInput(pe,d[te],T[G])!==0&&_e(`Can't bind input[${G}] for session=${e}.`)}for(let G=0;G<$;G++){let te=i[G];(we=a[G])!=null&&we[3]?s._OrtBindOutput(pe,p[te],x[G],0)!==0&&_e(`Can't bind pre-allocated output[${G}] for session=${e}.`):s._OrtBindOutput(pe,p[te],0,_t[te])!==0&&_e(`Can't bind output[${G}] to ${Te[G]} for session=${e}.`)}$r.set(e,[l,d,p,f,h,!0])}(oe=s.jsepOnRunStart)==null||oe.call(s,l),(ye=s.webnnOnRunStart)==null||ye.call(s,l);let Ae;f?Ae=await s._OrtRunWithBinding(l,f.handle,$,V,w):Ae=await s._OrtRun(l,L,B,y,J,$,V,w),Ae!==0&&_e("failed to call OrtRun().");let me=[],Oe=[];for(let pe=0;pe<$;pe++){let Te=Number(s.getValue(V+pe*o,"*"));if(Te===x[pe]){me.push(a[pe]);continue}let _t=s.stackSave(),G=s.stackAlloc(4*o),te=!1,ge,Re=0;try{s._OrtGetTensorData(Te,G,G+o,G+2*o,G+3*o)!==0&&_e(`Can't access output tensor data on index ${pe}.`);let Ut=o===4?"i32":"i64",ki=Number(s.getValue(G,Ut));Re=s.getValue(G+o,"*");let Qp=s.getValue(G+o*2,"*"),$f=Number(s.getValue(G+o*3,Ut)),xr=[];for(let gt=0;gt<$f;gt++)xr.push(Number(s.getValue(Qp+gt*o,Ut)));s._OrtFree(Qp)!==0&&_e("Can't free memory for tensor dims.");let Sr=xr.reduce((gt,nt)=>gt*nt,1);ge=At(ki);let ba=f==null?void 0:f.outputPreferredLocations[i[pe]];if(ge==="string"){if(ba==="gpu-buffer"||ba==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let gt=[];for(let nt=0;nt<Sr;nt++){let hr=s.getValue(Re+nt*o,"*"),vf=s.getValue(Re+(nt+1)*o,"*"),xf=nt===Sr-1?void 0:vf-hr;gt.push(s.UTF8ToString(hr,xf))}me.push([ge,xr,gt,"cpu"])}else if(ba==="gpu-buffer"&&Sr>0){let gt=s.jsepGetBuffer;if(!gt)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let nt=gt(Re),hr=Ot(ki,Sr);if(hr===void 0||!Fr(ge))throw new Error(`Unsupported data type: ${ge}`);te=!0,me.push([ge,xr,{gpuBuffer:nt,download:s.jsepCreateDownloader(nt,hr,ge),dispose:()=>{s._OrtReleaseTensor(Te)!==0&&_e("Can't release tensor.")}},"gpu-buffer"])}else if(ba==="ml-tensor"&&Sr>0){let gt=s.webnnEnsureTensor,nt=s.webnnIsGraphInputOutputTypeSupported;if(!gt||!nt)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Ot(ki,Sr)===void 0||!Wr(ge))throw new Error(`Unsupported data type: ${ge}`);if(!nt(e,ge,!1))throw new Error(`preferredLocation "ml-tensor" for ${ge} output is not supported by current WebNN Context.`);let hr=await gt(e,Re,ki,xr,!1);te=!0,me.push([ge,xr,{mlTensor:hr,download:s.webnnCreateMLTensorDownloader(Re,ge),dispose:()=>{s.webnnReleaseTensorId(Re),s._OrtReleaseTensor(Te)}},"ml-tensor"])}else if(ba==="ml-tensor-cpu-output"&&Sr>0){let gt=s.webnnCreateMLTensorDownloader(Re,ge)(),nt=me.length;te=!0,Oe.push((async()=>{let hr=[nt,await gt];return s.webnnReleaseTensorId(Re),s._OrtReleaseTensor(Te),hr})()),me.push([ge,xr,[],"cpu"])}else{let gt=qr(ge),nt=new gt(Sr);new Uint8Array(nt.buffer,nt.byteOffset,nt.byteLength).set(s.HEAPU8.subarray(Re,Re+nt.byteLength)),me.push([ge,xr,nt,"cpu"])}}finally{s.stackRestore(_t),ge==="string"&&Re&&s._free(Re),te||s._OrtReleaseTensor(Te)}}f&&!h&&(s._OrtClearBoundOutputs(f.handle)!==0&&_e("Can't clear bound outputs."),$r.set(e,[l,d,p,f,h,!1]));for(let[pe,Te]of await Promise.all(Oe))me[pe][2]=Te;return me}finally{(Ue=s.webnnOnRunEnd)==null||Ue.call(s,l),s.stackRestore(P),T.forEach(Ae=>s._OrtReleaseTensor(Ae)),x.forEach(Ae=>s._OrtReleaseTensor(Ae)),z.forEach(Ae=>s._free(Ae)),w!==0&&s._OrtReleaseRunOptions(w),_.forEach(Ae=>s._free(Ae))}},as=e=>{let t=Se(),r=$r.get(e);if(!r)throw new Error("invalid session id");let i=r[0],a=t._OrtEndProfiling(i);a===0&&_e("Can't get an profile file name."),t._OrtFree(a)},ns=e=>{let t=[];for(let r of e){let i=r[2];!Array.isArray(i)&&"buffer"in i&&t.push(i.buffer)}return t}}),vr,Mt,Ii,_a,wa,Va,ss,Fa,ai,ni,Dp,Pp,Up,Np,Lp,qp,Vp,Fp,Wp=E(()=>{ct(),Bp(),Ct(),Dr(),vr=()=>!!Q.wasm.proxy&&typeof document<"u",Ii=!1,_a=!1,wa=!1,Fa=new Map,ai=(e,t)=>{let r=Fa.get(e);r?r.push(t):Fa.set(e,[t])},ni=()=>{if(Ii||!_a||wa||!Mt)throw new Error("worker not ready")},Dp=e=>{switch(e.data.type){case"init-wasm":Ii=!1,e.data.err?(wa=!0,ss[1](e.data.err)):(_a=!0,ss[0]()),Va&&(URL.revokeObjectURL(Va),Va=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Fa.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Pp=async()=>{if(!_a){if(Ii)throw new Error("multiple calls to 'initWasm()' detected.");if(wa)throw new Error("previous call to 'initWasm()' failed.");if(Ii=!0,vr())return new Promise((e,t)=>{Mt==null||Mt.terminate(),qi().then(([r,i])=>{try{Mt=i,Mt.onerror=n=>t(n),Mt.onmessage=Dp,ss=[e,t];let a={type:"init-wasm",in:Q};if(!a.in.wasm.wasmPaths&&r){let n=Or();n&&(a.in.wasm.wasmPaths=n)}Mt.postMessage(a),Va=r}catch(a){t(a)}},t)});try{await Nr(Q.wasm),await Xn(Q),_a=!0}catch(e){throw wa=!0,e}finally{Ii=!1}}},Up=async e=>{if(vr())return ni(),new Promise((t,r)=>{ai("init-ep",[t,r]);let i={type:"init-ep",in:{epName:e,env:Q}};Mt.postMessage(i)});await Yn(Q,e)},Np=async e=>vr()?(ni(),new Promise((t,r)=>{ai("copy-from",[t,r]);let i={type:"copy-from",in:{buffer:e}};Mt.postMessage(i,[e.buffer])})):qa(e),Lp=async(e,t)=>{if(vr()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return ni(),new Promise((r,i)=>{ai("create",[r,i]);let a={type:"create",in:{model:e,options:{...t}}},n=[];e instanceof Uint8Array&&n.push(e.buffer),Mt.postMessage(a,n)})}else return es(e,t)},qp=async e=>{if(vr())return ni(),new Promise((t,r)=>{ai("release",[t,r]);let i={type:"release",in:e};Mt.postMessage(i)});ts(e)},Vp=async(e,t,r,i,a,n)=>{if(vr()){if(r.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return ni(),new Promise((s,o)=>{ai("run",[s,o]);let u=r,l={type:"run",in:{sessionId:e,inputIndices:t,inputs:u,outputIndices:i,options:n}};Mt.postMessage(l,ns(u))})}else return is(e,t,r,i,a,n)},Fp=async e=>{if(vr())return ni(),new Promise((t,r)=>{ai("end-profiling",[t,r]);let i={type:"end-profiling",in:e};Mt.postMessage(i)});as(e)}}),os,Gp,jp,yf=E(()=>{ct(),Wp(),be(),Cr(),Yi(),os=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},Gp=e=>{switch(e[3]){case"cpu":return new We(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Fr(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:i,dispose:a}=e[2];return We.fromGpuBuffer(r,{dataType:t,dims:e[1],download:i,dispose:a})}case"ml-tensor":{let t=e[0];if(!Wr(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:i,dispose:a}=e[2];return We.fromMLTensor(r,{dataType:t,dims:e[1],download:i,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},jp=class{async fetchModelAndCopyToWasmMemory(e){return Np(await Gr(e))}async loadModel(e,t){lt();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Lp(r,t),ot()}async dispose(){return qp(this.sessionId)}async run(e,t,r){lt();let i=[],a=[];Object.entries(e).forEach(p=>{let f=p[0],h=p[1],m=this.inputNames.indexOf(f);if(m===-1)throw new Error(`invalid input '${f}'`);i.push(h),a.push(m)});let n=[],s=[];Object.entries(t).forEach(p=>{let f=p[0],h=p[1],m=this.outputNames.indexOf(f);if(m===-1)throw new Error(`invalid output '${f}'`);n.push(h),s.push(m)});let o=i.map((p,f)=>os(p,()=>`input "${this.inputNames[a[f]]}"`)),u=n.map((p,f)=>p?os(p,()=>`output "${this.outputNames[s[f]]}"`):null),l=await Vp(this.sessionId,a,o,s,u,r),d={};for(let p=0;p<l.length;p++)d[this.outputNames[s[p]]]=n[p]??Gp(l[p]);return ot(),d}startProfiling(){}endProfiling(){Fp(this.sessionId)}}}),Hp={};ce(Hp,{OnnxruntimeWebAssemblyBackend:()=>ls,initializeFlags:()=>us,wasmBackend:()=>Kp});var us,ls,Kp,_f=E(()=>{ct(),Wp(),yf(),us=()=>{(typeof Q.wasm.initTimeout!="number"||Q.wasm.initTimeout<0)&&(Q.wasm.initTimeout=0);let e=Q.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),Q.wasm.simd=!1),typeof Q.wasm.proxy!="boolean"&&(Q.wasm.proxy=!1),typeof Q.wasm.trace!="boolean"&&(Q.wasm.trace=!1),typeof Q.wasm.numThreads!="number"||!Number.isInteger(Q.wasm.numThreads)||Q.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)Q.wasm.numThreads=1;else{let t=typeof navigator>"u"?re("node:os").cpus().length:navigator.hardwareConcurrency;Q.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},ls=class{async init(e){us(),await Pp(),await Up(e)}async createInferenceSessionHandler(e,t){let r=new jp;return await r.loadModel(e,t),r}},Kp=new ls}),Zp={};ce(Zp,{InferenceSession:()=>kr,TRACE:()=>Jt,TRACE_FUNC_BEGIN:()=>lt,TRACE_FUNC_END:()=>ot,Tensor:()=>We,default:()=>bf,env:()=>Q,registerBackend:()=>le}),ct(),ct(),ct();var wf="1.22.0",bf=Ri;{let e=(_f(),Ee(Hp)).wasmBackend;le("webgpu",e,5),le("webnn",e,5),le("cpu",e,10),le("wasm",e,10)}return Object.defineProperty(Q.versions,"web",{value:wf,enumerable:!0}),Ee(Zp)})();/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 *//**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 *//**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */v.exports=W})(hc);var Gf=hc.exports,ms={},yc={};Object.defineProperty(yc,"__esModule",{value:!0});var Ha={},_c;Object.defineProperty(Ha,"__esModule",{value:!0});Ha.SileroLegacy=void 0;const nc=Er;class gs{constructor(O,W,H,X,D){this.ortInstance=O,this._session=W,this._h=H,this._c=X,this._sr=D,this.reset_state=()=>{const se=Array(128).fill(0);this._h=new this.ortInstance.Tensor("float32",se,[2,1,64]),this._c=new this.ortInstance.Tensor("float32",se,[2,1,64])},this.process=async se=>{var fe;const E={input:new this.ortInstance.Tensor("float32",se,[1,se.length]),h:this._h,c:this._c,sr:this._sr},ce=await this._session.run(E);this._h=ce.hn,this._c=ce.cn;const[$e]=(fe=ce.output)==null?void 0:fe.data;return{notSpeech:1-$e,isSpeech:$e}},this.release=async()=>{await this._session.release(),this._h.dispose(),this._c.dispose(),this._sr.dispose()}}}Ha.SileroLegacy=gs;_c=gs;gs.new=async(v,O)=>{nc.log.debug("initializing vad");const W=await O(),H=await v.InferenceSession.create(W),X=new v.Tensor("int64",[16000n]),D=Array(2*64).fill(0),se=new v.Tensor("float32",D,[2,1,64]),re=new v.Tensor("float32",D,[2,1,64]);return nc.log.debug("vad is initialized"),new _c(v,H,se,re,X)};var Ka={},wc;Object.defineProperty(Ka,"__esModule",{value:!0});Ka.SileroV5=void 0;const sc=Er;function bc(v){const O=Array(256).fill(0);return new v.Tensor("float32",O,[2,1,128])}class ys{constructor(O,W,H,X){this._session=O,this._state=W,this._sr=H,this.ortInstance=X,this.reset_state=()=>{this._state=bc(this.ortInstance)},this.process=async D=>{var Ee;const re={input:new this.ortInstance.Tensor("float32",D,[1,D.length]),state:this._state,sr:this._sr},E=await this._session.run(re);if(!E.stateN)throw new Error("No state from model");if(this._state=E.stateN,!((Ee=E.output)!=null&&Ee.data))throw new Error("No output from model");const ce=E.output.data[0];if(typeof ce!="number")throw new Error("Weird output data");return{notSpeech:1-ce,isSpeech:ce}},this.release=async()=>{await this._session.release(),this._state.dispose(),this._sr.dispose()}}}Ka.SileroV5=ys;wc=ys;ys.new=async(v,O)=>{sc.log.debug("Loading VAD...");const W=await O(),H=await v.InferenceSession.create(W),X=new v.Tensor("int64",[16000n]),D=bc(v);return sc.log.debug("...finished loading VAD"),new wc(H,D,X,v)};(function(v){var O=vt&&vt.__createBinding||(Object.create?function(D,se,re,E){E===void 0&&(E=re);var ce=Object.getOwnPropertyDescriptor(se,re);(!ce||("get"in ce?!se.__esModule:ce.writable||ce.configurable))&&(ce={enumerable:!0,get:function(){return se[re]}}),Object.defineProperty(D,E,ce)}:function(D,se,re,E){E===void 0&&(E=re),D[E]=se[re]}),W=vt&&vt.__exportStar||function(D,se){for(var re in D)re!=="default"&&!Object.prototype.hasOwnProperty.call(se,re)&&O(se,D,re)};Object.defineProperty(v,"__esModule",{value:!0}),v.SileroV5=v.SileroLegacy=void 0,W(yc,v);var H=Ha;Object.defineProperty(v,"SileroLegacy",{enumerable:!0,get:function(){return H.SileroLegacy}});var X=Ka;Object.defineProperty(v,"SileroV5",{enumerable:!0,get:function(){return X.SileroV5}})})(ms);var Ta={};Object.defineProperty(Ta,"__esModule",{value:!0});Ta.Resampler=void 0;const jf=Er;class Hf{constructor(O){this.options=O,this.process=W=>{const H=[];for(const X of W)for(this.inputBuffer.push(X);this.hasEnoughDataForFrame();){const D=this.generateOutputFrame();H.push(D)}return H},O.nativeSampleRate<16e3&&jf.log.error("nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"),this.inputBuffer=[]}async*stream(O){for(const W of O)for(this.inputBuffer.push(W);this.hasEnoughDataForFrame();)yield this.generateOutputFrame()}hasEnoughDataForFrame(){return this.inputBuffer.length*this.options.targetSampleRate/this.options.nativeSampleRate>=this.options.targetFrameSize}generateOutputFrame(){const O=new Float32Array(this.options.targetFrameSize);let W=0,H=0;for(;W<this.options.targetFrameSize;){let X=0,D=0;for(;H<Math.min(this.inputBuffer.length,(W+1)*this.options.nativeSampleRate/this.options.targetSampleRate);){const se=this.inputBuffer[H];se!==void 0&&(X+=se,D++),H++}O[W]=X/D,W++}return this.inputBuffer=this.inputBuffer.slice(H),O}}Ta.Resampler=Hf;(function(v){var O=vt&&vt.__createBinding||(Object.create?function(fe,ve,le,xe){xe===void 0&&(xe=le);var Le=Object.getOwnPropertyDescriptor(ve,le);(!Le||("get"in Le?!ve.__esModule:Le.writable||Le.configurable))&&(Le={enumerable:!0,get:function(){return ve[le]}}),Object.defineProperty(fe,xe,Le)}:function(fe,ve,le,xe){xe===void 0&&(xe=le),fe[xe]=ve[le]}),W=vt&&vt.__setModuleDefault||(Object.create?function(fe,ve){Object.defineProperty(fe,"default",{enumerable:!0,value:ve})}:function(fe,ve){fe.default=ve}),H=vt&&vt.__importStar||function(fe){if(fe&&fe.__esModule)return fe;var ve={};if(fe!=null)for(var le in fe)le!=="default"&&Object.prototype.hasOwnProperty.call(fe,le)&&O(ve,fe,le);return W(ve,fe),ve};Object.defineProperty(v,"__esModule",{value:!0}),v.NonRealTimeVAD=v.defaultNonRealTimeVADOptions=void 0;const X=H(Gf),D=Sa,se=Ci,re=sr,E=li,ce=ms,$e=Ta;v.defaultNonRealTimeVADOptions={...re.defaultFrameProcessorOptions,modelURL:D.baseAssetPath+"silero_vad_legacy.onnx",modelFetcher:se.defaultModelFetcher};class Ee{static async new(ve={}){const le={...v.defaultNonRealTimeVADOptions,...ve};(0,re.validateOptions)(le),le.ortConfig!==void 0&&le.ortConfig(X);const xe=()=>le.modelFetcher(le.modelURL),Le=await ce.SileroLegacy.new(X,xe),Ge=new re.FrameProcessor(Le.process,Le.reset_state,{positiveSpeechThreshold:le.positiveSpeechThreshold,negativeSpeechThreshold:le.negativeSpeechThreshold,redemptionMs:le.redemptionMs,preSpeechPadMs:le.preSpeechPadMs,minSpeechMs:le.minSpeechMs,submitUserSpeechOnPause:le.submitUserSpeechOnPause},1536/16);return Ge.resume(),new this(xe,X,le,Ge)}constructor(ve,le,xe,Le){this.modelFetcher=ve,this.ort=le,this.options=xe,this.frameProcessor=Le,this.frameSamples=1536}async*run(ve,le){const xe={nativeSampleRate:le,targetSampleRate:16e3,targetFrameSize:this.frameSamples},Le=new $e.Resampler(xe);let Ge=0,Ie=0,Y=0;for await(const ie of Le.stream(ve)){const q=[];await this.frameProcessor.process(ie,ae=>{q.push(ae)});for(const ae of q)switch(ae.msg){case E.Message.SpeechStart:Ge=Y*this.frameSamples/16;break;case E.Message.SpeechEnd:Ie=(Y+1)*this.frameSamples/16,yield{audio:ae.audio,start:Ge,end:Ie};break}Y++}const ue=[];this.frameProcessor.endSegment(ie=>{ue.push(ie)});for(const ie of ue)switch(ie.msg){case E.Message.SpeechEnd:yield{audio:ie.audio,start:Ge,end:Y*this.frameSamples/16}}}}v.NonRealTimeVAD=Ee})(fc);var nr={};Object.defineProperty(nr,"__esModule",{value:!0});nr.audioFileToArray=nr.encodeWAV=nr.arrayBufferToBase64=nr.minFramesForTargetMS=void 0;function Kf(v,O,W=16e3){return Math.ceil(v*W/1e3/O)}nr.minFramesForTargetMS=Kf;function Zf(v){const O=new Uint8Array(v),W=O.byteLength,H=new Array(W);for(let X=0;X<W;X++){const D=O[X];if(D===void 0)break;H[X]=String.fromCharCode(D)}return btoa(H.join(""))}nr.arrayBufferToBase64=Zf;function Qf(v,O=3,W=16e3,H=1,X=32){const D=X/8,se=H*D,re=new ArrayBuffer(44+v.length*D),E=new DataView(re);return Wa(E,0,"RIFF"),E.setUint32(4,36+v.length*D,!0),Wa(E,8,"WAVE"),Wa(E,12,"fmt "),E.setUint32(16,16,!0),E.setUint16(20,O,!0),E.setUint16(22,H,!0),E.setUint32(24,W,!0),E.setUint32(28,W*se,!0),E.setUint16(32,se,!0),E.setUint16(34,X,!0),Wa(E,36,"data"),E.setUint32(40,v.length*D,!0),O===1?Yf(E,44,v):Xf(E,44,v),re}nr.encodeWAV=Qf;function Xf(v,O,W){for(let H=0;H<W.length;H++,O+=4)v.setFloat32(O,W[H],!0)}function Yf(v,O,W){for(let H=0;H<W.length;H++,O+=2){const X=Math.max(-1,Math.min(1,W[H]));v.setInt16(O,X<0?X*32768:X*32767,!0)}}function Wa(v,O,W){for(let H=0;H<W.length;H++)v.setUint8(O+H,W.charCodeAt(H))}async function Jf(v){const O=new OfflineAudioContext(1,1,44100),W=new FileReader;let H=null;if(await new Promise(se=>{W.addEventListener("loadend",()=>{const re=W.result;O.decodeAudioData(re,E=>{H=E,O.startRendering().then(()=>{console.log("Rendering completed successfully"),se()}).catch(ce=>{console.error("Rendering failed: ",ce)})},E=>{console.log("Error with decoding audio data: ",E)})}),W.readAsArrayBuffer(v)}),H===null)throw Error("some shit");const X=H,D=new Float32Array(X.length);for(let se=0;se<X.length;se++)for(let re=0;re<X.numberOfChannels;re++){const E=X.getChannelData(re)[se],ce=D[se];if(E===void 0||ce===void 0)throw new Error("sample or out[i] is undefined");D[se]=ce+E}return{audio:D,sampleRate:X.sampleRate}}nr.audioFileToArray=Jf;var $c={},vc={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */(function(v,O){var W=(()=>{var H=Object.defineProperty,X=Object.getOwnPropertyDescriptor,D=Object.getOwnPropertyNames,se=Object.prototype.hasOwnProperty,re=(c=>typeof Lt<"u"?Lt:typeof Proxy<"u"?new Proxy(c,{get:(g,b)=>(typeof Lt<"u"?Lt:g)[b]}):c)(function(c){if(typeof Lt<"u")return Lt.apply(this,arguments);throw Error('Dynamic require of "'+c+'" is not supported')}),E=(c,g)=>()=>(c&&(g=c(c=0)),g),ce=(c,g)=>{for(var b in g)H(c,b,{get:g[b],enumerable:!0})},$e=(c,g,b,I)=>{if(g&&typeof g=="object"||typeof g=="function")for(let S of D(g))!se.call(c,S)&&S!==b&&H(c,S,{get:()=>g[S],enumerable:!(I=X(g,S))||I.enumerable});return c},Ee=c=>$e(H({},"__esModule",{value:!0}),c),fe,ve,le,xe,Le,Ge=E(()=>{fe=new Map,ve=[],le=(c,g,b)=>{if(g&&typeof g.init=="function"&&typeof g.createInferenceSessionHandler=="function"){let I=fe.get(c);if(I===void 0)fe.set(c,{backend:g,priority:b});else{if(I.priority>b)return;if(I.priority===b&&I.backend!==g)throw new Error(`cannot register backend "${c}" using priority ${b}`)}if(b>=0){let S=ve.indexOf(c);S!==-1&&ve.splice(S,1);for(let R=0;R<ve.length;R++)if(fe.get(ve[R]).priority<=b){ve.splice(R,0,c);return}ve.push(c)}return}throw new TypeError("not a valid backend")},xe=async c=>{let g=fe.get(c);if(!g)return"backend not found.";if(g.initialized)return g.backend;if(g.aborted)return g.error;{let b=!!g.initPromise;try{return b||(g.initPromise=g.backend.init(c)),await g.initPromise,g.initialized=!0,g.backend}catch(I){return b||(g.error=`${I}`,g.aborted=!0),g.error}finally{delete g.initPromise}}},Le=async c=>{let g=c.executionProviders||[],b=g.map(M=>typeof M=="string"?M:M.name),I=b.length===0?ve:b,S,R=[],C=new Set;for(let M of I){let F=await xe(M);typeof F=="string"?R.push({name:M,err:F}):(S||(S=F),S===F&&C.add(M))}if(!S)throw new Error(`no available backend found. ERR: ${R.map(M=>`[${M.name}] ${M.err}`).join(", ")}`);for(let{name:M,err:F}of R)b.includes(M)&&console.warn(`removing requested execution provider "${M}" from session options because it is not available: ${F}`);let k=g.filter(M=>C.has(typeof M=="string"?M:M.name));return[S,new Proxy(c,{get:(M,F)=>F==="executionProviders"?k:Reflect.get(M,F)})]}}),Ie=E(()=>{Ge()}),Y,ue=E(()=>{Y="1.22.0"}),ie,q,ae=E(()=>{ue(),ie="warning",q={wasm:{},webgl:{},webgpu:{},versions:{common:Y},set logLevel(c){if(c!==void 0){if(typeof c!="string"||["verbose","info","warning","error","fatal"].indexOf(c)===-1)throw new Error(`Unsupported logging level: ${c}`);ie=c}},get logLevel(){return ie}},Object.defineProperty(q,"logLevel",{enumerable:!0})}),Q,Ne=E(()=>{ae(),Q=q}),Ce,qe,yt=E(()=>{Ce=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);b.width=c.dims[3],b.height=c.dims[2];let I=b.getContext("2d");if(I!=null){let S,R;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(S=c.dims[2],R=c.dims[3]):(S=c.dims[3],R=c.dims[2]);let C=(g==null?void 0:g.format)!==void 0?g.format:"RGB",k=g==null?void 0:g.norm,M,F;k===void 0||k.mean===void 0?M=[255,255,255,255]:typeof k.mean=="number"?M=[k.mean,k.mean,k.mean,k.mean]:(M=[k.mean[0],k.mean[1],k.mean[2],0],k.mean[3]!==void 0&&(M[3]=k.mean[3])),k===void 0||k.bias===void 0?F=[0,0,0,0]:typeof k.bias=="number"?F=[k.bias,k.bias,k.bias,k.bias]:(F=[k.bias[0],k.bias[1],k.bias[2],0],k.bias[3]!==void 0&&(F[3]=k.bias[3]));let j=R*S,K=0,U=j,ne=j*2,A=-1;C==="RGBA"?(K=0,U=j,ne=j*2,A=j*3):C==="RGB"?(K=0,U=j,ne=j*2):C==="RBG"&&(K=0,ne=j,U=j*2);for(let Z=0;Z<R;Z++)for(let Qe=0;Qe<S;Qe++){let ze=(c.data[K++]-F[0])*M[0],ke=(c.data[U++]-F[1])*M[1],He=(c.data[ne++]-F[2])*M[2],de=A===-1?255:(c.data[A++]-F[3])*M[3];I.fillStyle="rgba("+ze+","+ke+","+He+","+de+")",I.fillRect(Qe,Z,1,1)}if("toDataURL"in b)return b.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},qe=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),I;if(b!=null){let S,R,C;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(S=c.dims[2],R=c.dims[1],C=c.dims[3]):(S=c.dims[3],R=c.dims[2],C=c.dims[1]);let k=g!==void 0&&g.format!==void 0?g.format:"RGB",M=g==null?void 0:g.norm,F,j;M===void 0||M.mean===void 0?F=[255,255,255,255]:typeof M.mean=="number"?F=[M.mean,M.mean,M.mean,M.mean]:(F=[M.mean[0],M.mean[1],M.mean[2],255],M.mean[3]!==void 0&&(F[3]=M.mean[3])),M===void 0||M.bias===void 0?j=[0,0,0,0]:typeof M.bias=="number"?j=[M.bias,M.bias,M.bias,M.bias]:(j=[M.bias[0],M.bias[1],M.bias[2],0],M.bias[3]!==void 0&&(j[3]=M.bias[3]));let K=R*S;if(g!==void 0&&(g.format!==void 0&&C===4&&g.format!=="RGBA"||C===3&&g.format!=="RGB"&&g.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let U=4,ne=0,A=1,Z=2,Qe=3,ze=0,ke=K,He=K*2,de=-1;k==="RGBA"?(ze=0,ke=K,He=K*2,de=K*3):k==="RGB"?(ze=0,ke=K,He=K*2):k==="RBG"&&(ze=0,He=K,ke=K*2),I=b.createImageData(S,R);for(let Ze=0;Ze<R*S;ne+=U,A+=U,Z+=U,Qe+=U,Ze++)I.data[ne]=(c.data[ze++]-j[0])*F[0],I.data[A]=(c.data[ke++]-j[1])*F[1],I.data[Z]=(c.data[He++]-j[2])*F[2],I.data[Qe]=de===-1?255:(c.data[de++]-j[3])*F[3]}else throw new Error("Can not access image data");return I}}),Xe,ut,st,It,Ve,wt,or=E(()=>{St(),Xe=(c,g)=>{if(c===void 0)throw new Error("Image buffer must be defined");if(g.height===void 0||g.width===void 0)throw new Error("Image height and width must be defined");if(g.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:b,width:I}=g,S=g.norm??{mean:255,bias:0},R,C;typeof S.mean=="number"?R=[S.mean,S.mean,S.mean,S.mean]:R=[S.mean[0],S.mean[1],S.mean[2],S.mean[3]??255],typeof S.bias=="number"?C=[S.bias,S.bias,S.bias,S.bias]:C=[S.bias[0],S.bias[1],S.bias[2],S.bias[3]??0];let k=g.format!==void 0?g.format:"RGBA",M=g.tensorFormat!==void 0&&g.tensorFormat!==void 0?g.tensorFormat:"RGB",F=b*I,j=M==="RGBA"?new Float32Array(F*4):new Float32Array(F*3),K=4,U=0,ne=1,A=2,Z=3,Qe=0,ze=F,ke=F*2,He=-1;k==="RGB"&&(K=3,U=0,ne=1,A=2,Z=-1),M==="RGBA"?He=F*3:M==="RBG"?(Qe=0,ke=F,ze=F*2):M==="BGR"&&(ke=0,ze=F,Qe=F*2);for(let de=0;de<F;de++,U+=K,A+=K,ne+=K,Z+=K)j[Qe++]=(c[U]+C[0])/R[0],j[ze++]=(c[ne]+C[1])/R[1],j[ke++]=(c[A]+C[2])/R[2],He!==-1&&Z!==-1&&(j[He++]=(c[Z]+C[3])/R[3]);return M==="RGBA"?new Be("float32",j,[1,4,b,I]):new Be("float32",j,[1,3,b,I])},ut=async(c,g)=>{let b=typeof HTMLImageElement<"u"&&c instanceof HTMLImageElement,I=typeof ImageData<"u"&&c instanceof ImageData,S=typeof ImageBitmap<"u"&&c instanceof ImageBitmap,R=typeof c=="string",C,k=g??{},M=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},F=j=>typeof HTMLCanvasElement<"u"&&j instanceof HTMLCanvasElement||j instanceof OffscreenCanvas?j.getContext("2d"):null;if(b){let j=M();j.width=c.width,j.height=c.height;let K=F(j);if(K!=null){let U=c.height,ne=c.width;if(g!==void 0&&g.resizedHeight!==void 0&&g.resizedWidth!==void 0&&(U=g.resizedHeight,ne=g.resizedWidth),g!==void 0){if(k=g,g.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");k.tensorFormat="RGBA",k.height=U,k.width=ne}else k.tensorFormat="RGBA",k.height=U,k.width=ne;K.drawImage(c,0,0),C=K.getImageData(0,0,ne,U).data}else throw new Error("Can not access image data")}else if(I){let j,K;if(g!==void 0&&g.resizedWidth!==void 0&&g.resizedHeight!==void 0?(j=g.resizedHeight,K=g.resizedWidth):(j=c.height,K=c.width),g!==void 0&&(k=g),k.format="RGBA",k.height=j,k.width=K,g!==void 0){let U=M();U.width=K,U.height=j;let ne=F(U);if(ne!=null)ne.putImageData(c,0,0),C=ne.getImageData(0,0,K,j).data;else throw new Error("Can not access image data")}else C=c.data}else if(S){if(g===void 0)throw new Error("Please provide image config with format for Imagebitmap");let j=M();j.width=c.width,j.height=c.height;let K=F(j);if(K!=null){let U=c.height,ne=c.width;return K.drawImage(c,0,0,ne,U),C=K.getImageData(0,0,ne,U).data,k.height=U,k.width=ne,Xe(C,k)}else throw new Error("Can not access image data")}else{if(R)return new Promise((j,K)=>{let U=M(),ne=F(U);if(!c||!ne)return K();let A=new Image;A.crossOrigin="Anonymous",A.src=c,A.onload=()=>{U.width=A.width,U.height=A.height,ne.drawImage(A,0,0,U.width,U.height);let Z=ne.getImageData(0,0,U.width,U.height);k.height=U.height,k.width=U.width,j(Xe(Z.data,k))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(C!==void 0)return Xe(C,k);throw new Error("Input data provided is not supported - aborted tensor creation")},st=(c,g)=>{let{width:b,height:I,download:S,dispose:R}=g,C=[1,I,b,4];return new Be({location:"texture",type:"float32",texture:c,dims:C,download:S,dispose:R})},It=(c,g)=>{let{dataType:b,dims:I,download:S,dispose:R}=g;return new Be({location:"gpu-buffer",type:b??"float32",gpuBuffer:c,dims:I,download:S,dispose:R})},Ve=(c,g)=>{let{dataType:b,dims:I,download:S,dispose:R}=g;return new Be({location:"ml-tensor",type:b??"float32",mlTensor:c,dims:I,download:S,dispose:R})},wt=(c,g,b)=>new Be({location:"cpu-pinned",type:c,data:g,dims:b??[g.length]})}),rt,xt,ee,Ye,Bt=E(()=>{rt=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),xt=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),ee=!1,Ye=()=>{if(!ee){ee=!0;let c=typeof BigInt64Array<"u"&&BigInt64Array.from,g=typeof BigUint64Array<"u"&&BigUint64Array.from,b=globalThis.Float16Array,I=typeof b<"u"&&b.from;c&&(rt.set("int64",BigInt64Array),xt.set(BigInt64Array,"int64")),g&&(rt.set("uint64",BigUint64Array),xt.set(BigUint64Array,"uint64")),I?(rt.set("float16",b),xt.set(b,"float16")):rt.set("float16",Uint16Array)}}}),kt,ur,je=E(()=>{St(),kt=c=>{let g=1;for(let b=0;b<c.length;b++){let I=c[b];if(typeof I!="number"||!Number.isSafeInteger(I))throw new TypeError(`dims[${b}] must be an integer, got: ${I}`);if(I<0)throw new RangeError(`dims[${b}] must be a non-negative integer, got: ${I}`);g*=I}return g},ur=(c,g)=>{switch(c.location){case"cpu":return new Be(c.type,c.data,g);case"cpu-pinned":return new Be({location:"cpu-pinned",data:c.data,type:c.type,dims:g});case"texture":return new Be({location:"texture",texture:c.texture,type:c.type,dims:g});case"gpu-buffer":return new Be({location:"gpu-buffer",gpuBuffer:c.gpuBuffer,type:c.type,dims:g});case"ml-tensor":return new Be({location:"ml-tensor",mlTensor:c.mlTensor,type:c.type,dims:g});default:throw new Error(`tensorReshape: tensor location ${c.location} is not supported`)}}}),Be,St=E(()=>{yt(),or(),Bt(),je(),Be=class{constructor(c,g,b){Ye();let I,S;if(typeof c=="object"&&"location"in c)switch(this.dataLocation=c.location,I=c.type,S=c.dims,c.location){case"cpu-pinned":{let C=rt.get(I);if(!C)throw new TypeError(`unsupported type "${I}" to create tensor from pinned buffer`);if(!(c.data instanceof C))throw new TypeError(`buffer should be of type ${C.name}`);this.cpuData=c.data;break}case"texture":{if(I!=="float32")throw new TypeError(`unsupported type "${I}" to create tensor from texture`);this.gpuTextureData=c.texture,this.downloader=c.download,this.disposer=c.dispose;break}case"gpu-buffer":{if(I!=="float32"&&I!=="float16"&&I!=="int32"&&I!=="int64"&&I!=="uint32"&&I!=="uint8"&&I!=="bool"&&I!=="uint4"&&I!=="int4")throw new TypeError(`unsupported type "${I}" to create tensor from gpu buffer`);this.gpuBufferData=c.gpuBuffer,this.downloader=c.download,this.disposer=c.dispose;break}case"ml-tensor":{if(I!=="float32"&&I!=="float16"&&I!=="int32"&&I!=="int64"&&I!=="uint32"&&I!=="uint64"&&I!=="int8"&&I!=="uint8"&&I!=="bool"&&I!=="uint4"&&I!=="int4")throw new TypeError(`unsupported type "${I}" to create tensor from MLTensor`);this.mlTensorData=c.mlTensor,this.downloader=c.download,this.disposer=c.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let C,k;if(typeof c=="string")if(I=c,k=b,c==="string"){if(!Array.isArray(g))throw new TypeError("A string tensor's data must be a string array.");C=g}else{let M=rt.get(c);if(M===void 0)throw new TypeError(`Unsupported tensor type: ${c}.`);if(Array.isArray(g)){if(c==="float16"&&M===Uint16Array||c==="uint4"||c==="int4")throw new TypeError(`Creating a ${c} tensor from number array is not supported. Please use ${M.name} as data.`);c==="uint64"||c==="int64"?C=M.from(g,BigInt):C=M.from(g)}else if(g instanceof M)C=g;else if(g instanceof Uint8ClampedArray)if(c==="uint8")C=Uint8Array.from(g);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(c==="float16"&&g instanceof Uint16Array&&M!==Uint16Array)C=new globalThis.Float16Array(g.buffer,g.byteOffset,g.length);else throw new TypeError(`A ${I} tensor's data must be type of ${M}`)}else if(k=g,Array.isArray(c)){if(c.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let M=typeof c[0];if(M==="string")I="string",C=c;else if(M==="boolean")I="bool",C=Uint8Array.from(c);else throw new TypeError(`Invalid element type of data array: ${M}.`)}else if(c instanceof Uint8ClampedArray)I="uint8",C=Uint8Array.from(c);else{let M=xt.get(c.constructor);if(M===void 0)throw new TypeError(`Unsupported type for tensor data: ${c.constructor}.`);I=M,C=c}if(k===void 0)k=[C.length];else if(!Array.isArray(k))throw new TypeError("A tensor's dims must be a number array");S=k,this.cpuData=C,this.dataLocation="cpu"}let R=kt(S);if(this.cpuData&&R!==this.cpuData.length&&!((I==="uint4"||I==="int4")&&Math.ceil(R/2)===this.cpuData.length))throw new Error(`Tensor's size(${R}) does not match data length(${this.cpuData.length}).`);this.type=I,this.dims=S,this.size=R}static async fromImage(c,g){return ut(c,g)}static fromTexture(c,g){return st(c,g)}static fromGpuBuffer(c,g){return It(c,g)}static fromMLTensor(c,g){return Ve(c,g)}static fromPinnedBuffer(c,g,b){return wt(c,g,b)}toDataURL(c){return Ce(this,c)}toImageData(c){return qe(this,c)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(c){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let g=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=g,c&&this.disposer&&(this.disposer(),this.disposer=void 0),g}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(c){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return ur(this,c)}}}),We,zi=E(()=>{St(),We=Be}),Jt,Ir,lt,ot,Ai=E(()=>{ae(),Jt=(c,g)=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||console.timeStamp(`${c}::ORT::${g}`)},Ir=(c,g)=>{var S;let b=((S=new Error().stack)==null?void 0:S.split(/\r\n|\r|\n/g))||[],I=!1;for(let R=0;R<b.length;R++){if(I&&!b[R].includes("TRACE_FUNC")){let C=`FUNC_${c}::${b[R].trim().split(" ")[1]}`;g&&(C+=`::${g}`),Jt("CPU",C);return}b[R].includes("TRACE_FUNC")&&(I=!0)}},lt=c=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||Ir("BEGIN",c)},ot=c=>{(typeof q.trace>"u"?!q.wasm.trace:!q.trace)||Ir("END",c)}}),Oi,Za=E(()=>{Ge(),zi(),Ai(),Oi=class xc{constructor(g){this.handler=g}async run(g,b,I){lt();let S={},R={};if(typeof g!="object"||g===null||g instanceof We||Array.isArray(g))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let C=!0;if(typeof b=="object"){if(b===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(b instanceof We)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(b)){if(b.length===0)throw new TypeError("'fetches' cannot be an empty array.");C=!1;for(let F of b){if(typeof F!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(F)===-1)throw new RangeError(`'fetches' contains invalid output name: ${F}.`);S[F]=null}if(typeof I=="object"&&I!==null)R=I;else if(typeof I<"u")throw new TypeError("'options' must be an object.")}else{let F=!1,j=Object.getOwnPropertyNames(b);for(let K of this.outputNames)if(j.indexOf(K)!==-1){let U=b[K];(U===null||U instanceof We)&&(F=!0,C=!1,S[K]=U)}if(F){if(typeof I=="object"&&I!==null)R=I;else if(typeof I<"u")throw new TypeError("'options' must be an object.")}else R=b}}else if(typeof b<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let F of this.inputNames)if(typeof g[F]>"u")throw new Error(`input '${F}' is missing in 'feeds'.`);if(C)for(let F of this.outputNames)S[F]=null;let k=await this.handler.run(g,S,R),M={};for(let F in k)if(Object.hasOwnProperty.call(k,F)){let j=k[F];j instanceof We?M[F]=j:M[F]=new We(j.type,j.data,j.dims)}return ot(),M}async release(){return this.handler.dispose()}static async create(g,b,I,S){lt();let R,C={};if(typeof g=="string"){if(R=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof Uint8Array){if(R=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&g instanceof SharedArrayBuffer){let j=g,K=0,U=g.byteLength;if(typeof b=="object"&&b!==null)C=b;else if(typeof b=="number"){if(K=b,!Number.isSafeInteger(K))throw new RangeError("'byteOffset' must be an integer.");if(K<0||K>=j.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${j.byteLength}).`);if(U=g.byteLength-K,typeof I=="number"){if(U=I,!Number.isSafeInteger(U))throw new RangeError("'byteLength' must be an integer.");if(U<=0||K+U>j.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${j.byteLength-K}].`);if(typeof S=="object"&&S!==null)C=S;else if(typeof S<"u")throw new TypeError("'options' must be an object.")}else if(typeof I<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof b<"u")throw new TypeError("'options' must be an object.");R=new Uint8Array(j,K,U)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[k,M]=await Le(C),F=await k.createInferenceSessionHandler(R,M);return ot(),new xc(F)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Qa=E(()=>{Za(),kr=Oi}),Xa=E(()=>{}),Ya=E(()=>{}),Ja=E(()=>{}),en=E(()=>{}),Ri={};ce(Ri,{InferenceSession:()=>kr,TRACE:()=>Jt,TRACE_FUNC_BEGIN:()=>lt,TRACE_FUNC_END:()=>ot,Tensor:()=>We,env:()=>Q,registerBackend:()=>le});var ct=E(()=>{Ie(),Ne(),Qa(),zi(),Xa(),Ya(),Ai(),Ja(),en()}),Cr=E(()=>{}),Mi={};ce(Mi,{default:()=>Bi});var zr,Ar,Bi,tn=E(()=>{var c;ea(),Ct(),Dr(),zr="ort-wasm-proxy-worker",Ar=((c=globalThis.self)==null?void 0:c.name)===zr,Ar&&(self.onmessage=g=>{let{type:b,in:I}=g.data;try{switch(b){case"init-wasm":Nr(I.wasm).then(()=>{pi(I).then(()=>{postMessage({type:b})},S=>{postMessage({type:b,err:S})})},S=>{postMessage({type:b,err:S})});break;case"init-ep":{let{epName:S,env:R}=I;ci(R,S).then(()=>{postMessage({type:b})},C=>{postMessage({type:b,err:C})});break}case"copy-from":{let{buffer:S}=I,R=Me(S);postMessage({type:b,out:R});break}case"create":{let{model:S,options:R}=I;Dt(S,R).then(C=>{postMessage({type:b,out:C})},C=>{postMessage({type:b,err:C})});break}case"release":mi(I),postMessage({type:b});break;case"run":{let{sessionId:S,inputIndices:R,inputs:C,outputIndices:k,options:M}=I;N(S,R,C,k,new Array(k.length).fill(null),M).then(F=>{F.some(j=>j[3]!=="cpu")?postMessage({type:b,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:b,out:F},gi([...C,...F]))},F=>{postMessage({type:b,err:F})});break}case"end-profiling":gr(I),postMessage({type:b});break;default:}}catch(S){postMessage({type:b,err:S})}}),Bi=Ar?null:g=>new Worker(g??Ke,{type:"classic",name:zr})}),Di,Pi,Ke,Or,lr,Ui,Ni,Rr,Li,Mr,qi,Br,Vi,Dr=E(()=>{Cr(),Di=typeof location>"u"?void 0:location.origin,Pi=()=>{var c,g;return typeof document<"u"?(c=document.currentScript)==null?void 0:c.src:typeof self<"u"?(g=self.location)==null?void 0:g.href:void 0},Ke=Pi(),Or=()=>{if(Ke&&!Ke.startsWith("blob:"))return Ke.substring(0,Ke.lastIndexOf("/")+1)},lr=(c,g)=>{try{let b=g??Ke;return(b?new URL(c,b):new URL(c)).origin===Di}catch{return!1}},Ui=(c,g)=>{let b=g??Ke;try{return(b?new URL(c,b):new URL(c)).href}catch{return}},Ni=(c,g)=>`${g??"./"}${c}`,Rr=async c=>{let g=await(await fetch(c,{credentials:"same-origin"})).blob();return URL.createObjectURL(g)},Li=async c=>(await import(c)).default,Mr=(tn(),Ee(Mi)).default,qi=async()=>{if(!Ke)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(lr(Ke))return[void 0,Mr()];let c=await Rr(Ke);return[c,Mr(c)]},Br=void 0,Vi=async(c,g,b)=>{if(!c&&!g&&Br&&Ke&&lr(Ke))return[void 0,Br];{let I="ort-wasm-simd-threaded.mjs",S=c??Ui(I,g),R=b&&S&&!lr(S,g),C=R?await Rr(S):S??Ni(I,g);return[R?C:void 0,await Li(C)]}}}),Pr,dr,qt,Ur,Fi,Wi,Gi,Nr,Se,Ct=E(()=>{Dr(),dr=!1,qt=!1,Ur=!1,Fi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Wi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Gi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async c=>{if(dr)return Promise.resolve();if(qt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");qt=!0;let g=c.initTimeout,b=c.numThreads;if(c.simd!==!1){if(c.simd==="relaxed"){if(!Gi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Wi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let I=Fi();b>1&&!I&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+b+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),c.numThreads=b=1);let S=c.wasmPaths,R=typeof S=="string"?S:void 0,C=S==null?void 0:S.mjs,k=(C==null?void 0:C.href)??C,M=S==null?void 0:S.wasm,F=(M==null?void 0:M.href)??M,j=c.wasmBinary,[K,U]=await Vi(k,R,b>1),ne=!1,A=[];if(g>0&&A.push(new Promise(Z=>{setTimeout(()=>{ne=!0,Z()},g)})),A.push(new Promise((Z,Qe)=>{let ze={numThreads:b};if(j)ze.wasmBinary=j;else if(F||R)ze.locateFile=ke=>F??R+ke;else if(k&&k.indexOf("blob:")!==0)ze.locateFile=ke=>new URL(ke,k).href;else if(K){let ke=Or();ke&&(ze.locateFile=He=>ke+He)}U(ze).then(ke=>{qt=!1,dr=!0,Pr=ke,Z(),K&&URL.revokeObjectURL(K)},ke=>{qt=!1,Ur=!0,Qe(ke)})})),await Promise.race(A),ne)throw new Error(`WebAssembly backend initializing failed due to timeout: ${g}ms`)},Se=()=>{if(dr&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),et,pr,_e,Lr=E(()=>{Ct(),et=(c,g)=>{let b=Se(),I=b.lengthBytesUTF8(c)+1,S=b._malloc(I);return b.stringToUTF8(c,S,I),g.push(S),S},pr=(c,g,b,I)=>{if(typeof c=="object"&&c!==null){if(b.has(c))throw new Error("Circular reference in options");b.add(c)}Object.entries(c).forEach(([S,R])=>{let C=g?g+S:S;if(typeof R=="object")pr(R,C+".",b,I);else if(typeof R=="string"||typeof R=="number")I(C,R.toString());else if(typeof R=="boolean")I(C,R?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof R}`)})},_e=c=>{let g=Se(),b=g.stackSave();try{let I=g.PTR_SIZE,S=g.stackAlloc(2*I);g._OrtGetLastError(S,S+I);let R=Number(g.getValue(S,I===4?"i32":"i64")),C=g.getValue(S+I,"*"),k=C?g.UTF8ToString(C):"";throw new Error(`${c} ERROR_CODE: ${R}, ERROR_MESSAGE: ${k}`)}finally{g.stackRestore(b)}}}),ji,rn=E(()=>{Ct(),Lr(),ji=c=>{let g=Se(),b=0,I=[],S=c||{};try{if((c==null?void 0:c.logSeverityLevel)===void 0)S.logSeverityLevel=2;else if(typeof c.logSeverityLevel!="number"||!Number.isInteger(c.logSeverityLevel)||c.logSeverityLevel<0||c.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${c.logSeverityLevel}`);if((c==null?void 0:c.logVerbosityLevel)===void 0)S.logVerbosityLevel=0;else if(typeof c.logVerbosityLevel!="number"||!Number.isInteger(c.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${c.logVerbosityLevel}`);(c==null?void 0:c.terminate)===void 0&&(S.terminate=!1);let R=0;return(c==null?void 0:c.tag)!==void 0&&(R=et(c.tag,I)),b=g._OrtCreateRunOptions(S.logSeverityLevel,S.logVerbosityLevel,!!S.terminate,R),b===0&&_e("Can't create run options."),(c==null?void 0:c.extra)!==void 0&&pr(c.extra,"",new WeakSet,(C,k)=>{let M=et(C,I),F=et(k,I);g._OrtAddRunConfigEntry(b,M,F)!==0&&_e(`Can't set a run config entry: ${C} - ${k}.`)}),[b,I]}catch(R){throw b!==0&&g._OrtReleaseRunOptions(b),I.forEach(C=>g._free(C)),R}}}),Hi,Ki,Zi,Vt,Qi,Xi,an=E(()=>{Ct(),Lr(),Hi=c=>{switch(c){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${c}`)}},Ki=c=>{switch(c){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${c}`)}},Zi=c=>{c.extra||(c.extra={}),c.extra.session||(c.extra.session={});let g=c.extra.session;g.use_ort_model_bytes_directly||(g.use_ort_model_bytes_directly="1"),c.executionProviders&&c.executionProviders.some(b=>(typeof b=="string"?b:b.name)==="webgpu")&&(c.enableMemPattern=!1)},Vt=(c,g,b,I)=>{let S=et(g,I),R=et(b,I);Se()._OrtAddSessionConfigEntry(c,S,R)!==0&&_e(`Can't set a session config entry: ${g} - ${b}.`)},Qi=async(c,g,b)=>{for(let I of g){let S=typeof I=="string"?I:I.name,R=[];switch(S){case"webnn":if(S="WEBNN",typeof I!="string"){let j=I==null?void 0:I.deviceType;j&&Vt(c,"deviceType",j,b)}break;case"webgpu":if(S="JS",typeof I!="string"){let j=I;if(j!=null&&j.preferredLayout){if(j.preferredLayout!=="NCHW"&&j.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${j.preferredLayout}`);Vt(c,"preferredLayout",j.preferredLayout,b)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${S}`)}let C=et(S,b),k=R.length,M=0,F=0;if(k>0){M=Se()._malloc(k*Se().PTR_SIZE),b.push(M),F=Se()._malloc(k*Se().PTR_SIZE),b.push(F);for(let j=0;j<k;j++)Se().setValue(M+j*Se().PTR_SIZE,R[j][0],"*"),Se().setValue(F+j*Se().PTR_SIZE,R[j][1],"*")}await Se()._OrtAppendExecutionProvider(c,C,M,F,k)!==0&&_e(`Can't append execution provider: ${S}.`)}},Xi=async c=>{let g=Se(),b=0,I=[],S=c||{};Zi(S);try{let R=Hi(S.graphOptimizationLevel??"all"),C=Ki(S.executionMode??"sequential"),k=typeof S.logId=="string"?et(S.logId,I):0,M=S.logSeverityLevel??2;if(!Number.isInteger(M)||M<0||M>4)throw new Error(`log serverity level is not valid: ${M}`);let F=S.logVerbosityLevel??0;if(!Number.isInteger(F)||F<0||F>4)throw new Error(`log verbosity level is not valid: ${F}`);let j=typeof S.optimizedModelFilePath=="string"?et(S.optimizedModelFilePath,I):0;if(b=g._OrtCreateSessionOptions(R,!!S.enableCpuMemArena,!!S.enableMemPattern,C,!!S.enableProfiling,0,k,M,F,j),b===0&&_e("Can't create session options."),S.executionProviders&&await Qi(b,S.executionProviders,I),S.enableGraphCapture!==void 0){if(typeof S.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${S.enableGraphCapture}`);Vt(b,"enableGraphCapture",S.enableGraphCapture.toString(),I)}if(S.freeDimensionOverrides)for(let[K,U]of Object.entries(S.freeDimensionOverrides)){if(typeof K!="string")throw new Error(`free dimension override name must be a string: ${K}`);if(typeof U!="number"||!Number.isInteger(U)||U<0)throw new Error(`free dimension override value must be a non-negative integer: ${U}`);let ne=et(K,I);g._OrtAddFreeDimensionOverride(b,ne,U)!==0&&_e(`Can't set a free dimension override: ${K} - ${U}.`)}return S.extra!==void 0&&pr(S.extra,"",new WeakSet,(K,U)=>{Vt(b,K,U,I)}),[b,I]}catch(R){throw b!==0&&g._OrtReleaseSessionOptions(b)!==0&&_e("Can't release session options."),I.forEach(C=>g._free(C)),R}}}),zt,At,Ot,qr,Vr,Fr,Wr,di,be=E(()=>{zt=c=>{switch(c){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${c}`)}},At=c=>{switch(c){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${c}`)}},Ot=(c,g)=>{let b=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][c],I=typeof g=="number"?g:g.reduce((S,R)=>S*R,1);return b>0?Math.ceil(I*b):void 0},qr=c=>{switch(c){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${c}`)}},Vr=c=>{switch(c){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${c}`)}},Fr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",Wr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint64"||c==="int8"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",di=c=>{switch(c){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${c}`)}}}),Gr,Yi=E(()=>{Cr(),Gr=async c=>{if(typeof c=="string"){let g=await fetch(c);if(!g.ok)throw new Error(`failed to load external data file: ${c}`);let b=g.headers.get("Content-Length"),I=b?parseInt(b,10):0;if(I<1073741824)return new Uint8Array(await g.arrayBuffer());{if(!g.body)throw new Error(`failed to load external data file: ${c}, no response body.`);let S=g.body.getReader(),R;try{R=new ArrayBuffer(I)}catch(k){if(k instanceof RangeError){let M=Math.ceil(I/65536);R=new WebAssembly.Memory({initial:M,maximum:M}).buffer}else throw k}let C=0;for(;;){let{done:k,value:M}=await S.read();if(k)break;let F=M.byteLength;new Uint8Array(R,C,F).set(M),C+=F}return new Uint8Array(R,0,I)}}else return c instanceof Blob?new Uint8Array(await c.arrayBuffer()):c instanceof Uint8Array?c:new Uint8Array(c)}}),Ji,pi,ci,er,fi,hi,Me,Dt,mi,tr,N,gr,gi,ea=E(()=>{rn(),an(),be(),Ct(),Lr(),Yi(),Ji=(c,g)=>{Se()._OrtInit(c,g)!==0&&_e("Can't initialize onnxruntime.")},pi=async c=>{Ji(c.wasm.numThreads,Vr(c.logLevel))},ci=async(c,g)=>{var b,I;(I=(b=Se()).asyncInit)==null||I.call(b)},er=new Map,fi=c=>{let g=Se(),b=g.stackSave();try{let I=g.PTR_SIZE,S=g.stackAlloc(2*I);g._OrtGetInputOutputCount(c,S,S+I)!==0&&_e("Can't get session input/output count.");let R=I===4?"i32":"i64";return[Number(g.getValue(S,R)),Number(g.getValue(S+I,R))]}finally{g.stackRestore(b)}},hi=(c,g)=>{let b=Se(),I=b.stackSave(),S=0;try{let R=b.PTR_SIZE,C=b.stackAlloc(2*R);b._OrtGetInputOutputMetadata(c,g,C,C+R)!==0&&_e("Can't get session input/output metadata.");let k=Number(b.getValue(C,"*"));S=Number(b.getValue(C+R,"*"));let M=b.HEAP32[S/4];if(M===0)return[k,0];let F=b.HEAPU32[S/4+1],j=[];for(let K=0;K<F;K++){let U=Number(b.getValue(S+8+K*R,"*"));j.push(U!==0?b.UTF8ToString(U):Number(b.getValue(S+8+(K+F)*R,"*")))}return[k,M,j]}finally{b.stackRestore(I),S!==0&&b._OrtFree(S)}},Me=c=>{let g=Se(),b=g._malloc(c.byteLength);if(b===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${c.byteLength}.`);return g.HEAPU8.set(c,b),[b,c.byteLength]},Dt=async(c,g)=>{var j,K,U;let b,I,S=Se();Array.isArray(c)?[b,I]=c:c.buffer===S.HEAPU8.buffer?[b,I]=[c.byteOffset,c.byteLength]:[b,I]=Me(c);let R=0,C=0,k=[],M=[],F=[];try{if([C,k]=await Xi(g),(g==null?void 0:g.externalData)&&S.mountExternalData){let Ze=[];for(let Pe of g.externalData){let dt=typeof Pe=="string"?Pe:Pe.path;Ze.push(Gr(typeof Pe=="string"?Pe:Pe.data).then(ft=>{S.mountExternalData(dt,ft)}))}await Promise.all(Ze)}for(let Ze of(g==null?void 0:g.executionProviders)??[])if((typeof Ze=="string"?Ze:Ze.name)==="webnn"){if(S.shouldTransferToMLTensor=!1,typeof Ze!="string"){let Pe=Ze,dt=Pe==null?void 0:Pe.context,ft=Pe==null?void 0:Pe.gpuDevice,Tt=Pe==null?void 0:Pe.deviceType,Zr=Pe==null?void 0:Pe.powerPreference;dt?S.currentContext=dt:ft?S.currentContext=await S.webnnCreateMLContext(ft):S.currentContext=await S.webnnCreateMLContext({deviceType:Tt,powerPreference:Zr})}else S.currentContext=await S.webnnCreateMLContext();break}R=await S._OrtCreateSession(b,I,C),(j=S.webgpuOnCreateSession)==null||j.call(S,R),R===0&&_e("Can't create a session."),(K=S.jsepOnCreateSession)==null||K.call(S),S.currentContext&&(S.webnnRegisterMLContext(R,S.currentContext),S.currentContext=void 0,S.shouldTransferToMLTensor=!0);let[ne,A]=fi(R),Z=!!(g!=null&&g.enableGraphCapture),Qe=[],ze=[],ke=[],He=[],de=[];for(let Ze=0;Ze<ne;Ze++){let[Pe,dt,ft]=hi(R,Ze);Pe===0&&_e("Can't get an input name."),M.push(Pe);let Tt=S.UTF8ToString(Pe);Qe.push(Tt),ke.push(dt===0?{name:Tt,isTensor:!1}:{name:Tt,isTensor:!0,type:At(dt),shape:ft})}for(let Ze=0;Ze<A;Ze++){let[Pe,dt,ft]=hi(R,Ze+ne);Pe===0&&_e("Can't get an output name."),F.push(Pe);let Tt=S.UTF8ToString(Pe);ze.push(Tt),He.push(dt===0?{name:Tt,isTensor:!1}:{name:Tt,isTensor:!0,type:At(dt),shape:ft})}return er.set(R,[R,M,F,null,Z,!1]),[R,Qe,ze,ke,He]}catch(ne){throw M.forEach(A=>S._OrtFree(A)),F.forEach(A=>S._OrtFree(A)),R!==0&&S._OrtReleaseSession(R)!==0&&_e("Can't release session."),ne}finally{S._free(b),C!==0&&S._OrtReleaseSessionOptions(C)!==0&&_e("Can't release session options."),k.forEach(ne=>S._free(ne)),(U=S.unmountExternalData)==null||U.call(S)}},mi=c=>{var M,F,j;let g=Se(),b=er.get(c);if(!b)throw new Error(`cannot release session. invalid session id: ${c}`);let[I,S,R,C,k]=b;C&&(k&&g._OrtClearBoundOutputs(C.handle)!==0&&_e("Can't clear bound outputs."),g._OrtReleaseBinding(C.handle)!==0&&_e("Can't release IO binding.")),(M=g.jsepOnReleaseSession)==null||M.call(g,c),(F=g.webnnOnReleaseSession)==null||F.call(g,c),(j=g.webgpuOnReleaseSession)==null||j.call(g,c),S.forEach(K=>g._OrtFree(K)),R.forEach(K=>g._OrtFree(K)),g._OrtReleaseSession(I)!==0&&_e("Can't release session."),er.delete(c)},tr=async(c,g,b,I,S,R,C=!1)=>{if(!c){g.push(0);return}let k=Se(),M=k.PTR_SIZE,F=c[0],j=c[1],K=c[3],U=K,ne,A;if(F==="string"&&(K==="gpu-buffer"||K==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(C&&K!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${R} when enableGraphCapture is true.`);if(K==="gpu-buffer"){let ze=c[2].gpuBuffer;A=Ot(zt(F),j);{let ke=k.jsepRegisterBuffer;if(!ke)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');ne=ke(I,R,ze,A)}}else if(K==="ml-tensor"){let ze=c[2].mlTensor;A=Ot(zt(F),j);let ke=k.webnnRegisterMLTensor;if(!ke)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');ne=ke(I,ze,zt(F),j)}else{let ze=c[2];if(Array.isArray(ze)){A=M*ze.length,ne=k._malloc(A),b.push(ne);for(let ke=0;ke<ze.length;ke++){if(typeof ze[ke]!="string")throw new TypeError(`tensor data at index ${ke} is not a string`);k.setValue(ne+ke*M,et(ze[ke],b),"*")}}else{let ke=k.webnnIsGraphInput,He=k.webnnIsGraphOutput;if(F!=="string"&&ke&&He){let de=k.UTF8ToString(S);if(ke(I,de)||He(I,de)){let Ze=zt(F);A=Ot(Ze,j),U="ml-tensor";let Pe=k.webnnCreateTemporaryTensor,dt=k.webnnUploadTensor;if(!Pe||!dt)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let ft=await Pe(I,Ze,j);dt(ft,new Uint8Array(ze.buffer,ze.byteOffset,ze.byteLength)),ne=ft}else A=ze.byteLength,ne=k._malloc(A),b.push(ne),k.HEAPU8.set(new Uint8Array(ze.buffer,ze.byteOffset,A),ne)}else A=ze.byteLength,ne=k._malloc(A),b.push(ne),k.HEAPU8.set(new Uint8Array(ze.buffer,ze.byteOffset,A),ne)}}let Z=k.stackSave(),Qe=k.stackAlloc(4*j.length);try{j.forEach((ke,He)=>k.setValue(Qe+He*M,ke,M===4?"i32":"i64"));let ze=k._OrtCreateTensor(zt(F),ne,A,Qe,j.length,di(U));ze===0&&_e(`Can't create tensor for input/output. session=${I}, index=${R}.`),g.push(ze)}finally{k.stackRestore(Z)}},N=async(c,g,b,I,S,R)=>{var Zr,bt,ua;let C=Se(),k=C.PTR_SIZE,M=er.get(c);if(!M)throw new Error(`cannot run inference. invalid session id: ${c}`);let F=M[0],j=M[1],K=M[2],U=M[3],ne=M[4];M[5];let A=g.length,Z=I.length,Qe=0,ze=[],ke=[],He=[],de=[],Ze=C.stackSave(),Pe=C.stackAlloc(A*k),dt=C.stackAlloc(A*k),ft=C.stackAlloc(Z*k),Tt=C.stackAlloc(Z*k);try{[Qe,ze]=ji(R);for(let De=0;De<A;De++)await tr(b[De],ke,de,c,j[g[De]],g[De],ne);for(let De=0;De<Z;De++)await tr(S[De],He,de,c,K[I[De]],A+I[De],ne);for(let De=0;De<A;De++)C.setValue(Pe+De*k,ke[De],"*"),C.setValue(dt+De*k,j[g[De]],"*");for(let De=0;De<Z;De++)C.setValue(ft+De*k,He[De],"*"),C.setValue(Tt+De*k,K[I[De]],"*");(Zr=C.jsepOnRunStart)==null||Zr.call(C,F),(bt=C.webnnOnRunStart)==null||bt.call(C,F);let Pt;Pt=await C._OrtRun(F,dt,Pe,A,Tt,Z,ft,Qe),Pt!==0&&_e("failed to call OrtRun().");let ht=[],la=[];for(let De=0;De<Z;De++){let Gt=Number(C.getValue(ft+De*k,"*"));if(Gt===He[De]){ht.push(S[De]);continue}let ka=C.stackSave(),jt=C.stackAlloc(4*k),Qr=!1,it,$t=0;try{C._OrtGetTensorData(Gt,jt,jt+k,jt+2*k,jt+3*k)!==0&&_e(`Can't access output tensor data on index ${De}.`);let Ei=k===4?"i32":"i64",Xr=Number(C.getValue(jt,Ei));$t=C.getValue(jt+k,"*");let Rt=C.getValue(jt+k*2,"*"),Ca=Number(C.getValue(jt+k*3,Ei)),Ht=[];for(let at=0;at<Ca;at++)Ht.push(Number(C.getValue(Rt+at*k,Ei)));C._OrtFree(Rt)!==0&&_e("Can't free memory for tensor dims.");let Kt=Ht.reduce((at,Je)=>at*Je,1);it=At(Xr);let br=U==null?void 0:U.outputPreferredLocations[I[De]];if(it==="string"){if(br==="gpu-buffer"||br==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let at=[];for(let Je=0;Je<Kt;Je++){let Nt=C.getValue($t+Je*k,"*"),za=C.getValue($t+(Je+1)*k,"*"),Aa=Je===Kt-1?void 0:za-Nt;at.push(C.UTF8ToString(Nt,Aa))}ht.push([it,Ht,at,"cpu"])}else if(br==="gpu-buffer"&&Kt>0){let at=C.jsepGetBuffer;if(!at)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let Je=at($t),Nt=Ot(Xr,Kt);if(Nt===void 0||!Fr(it))throw new Error(`Unsupported data type: ${it}`);Qr=!0,ht.push([it,Ht,{gpuBuffer:Je,download:C.jsepCreateDownloader(Je,Nt,it),dispose:()=>{C._OrtReleaseTensor(Gt)!==0&&_e("Can't release tensor.")}},"gpu-buffer"])}else if(br==="ml-tensor"&&Kt>0){let at=C.webnnEnsureTensor,Je=C.webnnIsGraphInputOutputTypeSupported;if(!at||!Je)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Ot(Xr,Kt)===void 0||!Wr(it))throw new Error(`Unsupported data type: ${it}`);if(!Je(c,it,!1))throw new Error(`preferredLocation "ml-tensor" for ${it} output is not supported by current WebNN Context.`);let Nt=await at(c,$t,Xr,Ht,!1);Qr=!0,ht.push([it,Ht,{mlTensor:Nt,download:C.webnnCreateMLTensorDownloader($t,it),dispose:()=>{C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Gt)}},"ml-tensor"])}else if(br==="ml-tensor-cpu-output"&&Kt>0){let at=C.webnnCreateMLTensorDownloader($t,it)(),Je=ht.length;Qr=!0,la.push((async()=>{let Nt=[Je,await at];return C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Gt),Nt})()),ht.push([it,Ht,[],"cpu"])}else{let at=qr(it),Je=new at(Kt);new Uint8Array(Je.buffer,Je.byteOffset,Je.byteLength).set(C.HEAPU8.subarray($t,$t+Je.byteLength)),ht.push([it,Ht,Je,"cpu"])}}finally{C.stackRestore(ka),it==="string"&&$t&&C._free($t),Qr||C._OrtReleaseTensor(Gt)}}U&&!ne&&(C._OrtClearBoundOutputs(U.handle)!==0&&_e("Can't clear bound outputs."),er.set(c,[F,j,K,U,ne,!1]));for(let[De,Gt]of await Promise.all(la))ht[De][2]=Gt;return ht}finally{(ua=C.webnnOnRunEnd)==null||ua.call(C,F),C.stackRestore(Ze),ke.forEach(Pt=>C._OrtReleaseTensor(Pt)),He.forEach(Pt=>C._OrtReleaseTensor(Pt)),de.forEach(Pt=>C._free(Pt)),Qe!==0&&C._OrtReleaseRunOptions(Qe),ze.forEach(Pt=>C._free(Pt))}},gr=c=>{let g=Se(),b=er.get(c);if(!b)throw new Error("invalid session id");let I=b[0],S=g._OrtEndProfiling(I);S===0&&_e("Can't get an profile file name."),g._OrtFree(S)},gi=c=>{let g=[];for(let b of c){let I=b[2];!Array.isArray(I)&&"buffer"in I&&g.push(I.buffer)}return g}}),Ft,he,rr,yr,cr,_r,jr,Hr,Wt,ir,yi,_i,wi,ta,ra,Ea,wr,ia,aa=E(()=>{ct(),ea(),Ct(),Dr(),Ft=()=>!!Q.wasm.proxy&&typeof document<"u",rr=!1,yr=!1,cr=!1,Hr=new Map,Wt=(c,g)=>{let b=Hr.get(c);b?b.push(g):Hr.set(c,[g])},ir=()=>{if(rr||!yr||cr||!he)throw new Error("worker not ready")},yi=c=>{switch(c.data.type){case"init-wasm":rr=!1,c.data.err?(cr=!0,jr[1](c.data.err)):(yr=!0,jr[0]()),_r&&(URL.revokeObjectURL(_r),_r=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let g=Hr.get(c.data.type);c.data.err?g.shift()[1](c.data.err):g.shift()[0](c.data.out);break}}},_i=async()=>{if(!yr){if(rr)throw new Error("multiple calls to 'initWasm()' detected.");if(cr)throw new Error("previous call to 'initWasm()' failed.");if(rr=!0,Ft())return new Promise((c,g)=>{he==null||he.terminate(),qi().then(([b,I])=>{try{he=I,he.onerror=R=>g(R),he.onmessage=yi,jr=[c,g];let S={type:"init-wasm",in:Q};if(!S.in.wasm.wasmPaths&&b){let R=Or();R&&(S.in.wasm.wasmPaths=R)}he.postMessage(S),_r=b}catch(S){g(S)}},g)});try{await Nr(Q.wasm),await pi(Q),yr=!0}catch(c){throw cr=!0,c}finally{rr=!1}}},wi=async c=>{if(Ft())return ir(),new Promise((g,b)=>{Wt("init-ep",[g,b]);let I={type:"init-ep",in:{epName:c,env:Q}};he.postMessage(I)});await ci(Q,c)},ta=async c=>Ft()?(ir(),new Promise((g,b)=>{Wt("copy-from",[g,b]);let I={type:"copy-from",in:{buffer:c}};he.postMessage(I,[c.buffer])})):Me(c),ra=async(c,g)=>{if(Ft()){if(g!=null&&g.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return ir(),new Promise((b,I)=>{Wt("create",[b,I]);let S={type:"create",in:{model:c,options:{...g}}},R=[];c instanceof Uint8Array&&R.push(c.buffer),he.postMessage(S,R)})}else return Dt(c,g)},Ea=async c=>{if(Ft())return ir(),new Promise((g,b)=>{Wt("release",[g,b]);let I={type:"release",in:c};he.postMessage(I)});mi(c)},wr=async(c,g,b,I,S,R)=>{if(Ft()){if(b.some(C=>C[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(S.some(C=>C))throw new Error("pre-allocated output tensor is not supported for proxy.");return ir(),new Promise((C,k)=>{Wt("run",[C,k]);let M=b,F={type:"run",in:{sessionId:c,inputIndices:g,inputs:M,outputIndices:I,options:R}};he.postMessage(F,gi(M))})}else return N(c,g,b,I,S,R)},ia=async c=>{if(Ft())return ir(),new Promise((g,b)=>{Wt("end-profiling",[g,b]);let I={type:"end-profiling",in:c};he.postMessage(I)});gr(c)}}),na,bi,$i,vi=E(()=>{ct(),aa(),be(),Cr(),Yi(),na=(c,g)=>{switch(c.location){case"cpu":return[c.type,c.dims,c.data,"cpu"];case"gpu-buffer":return[c.type,c.dims,{gpuBuffer:c.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[c.type,c.dims,{mlTensor:c.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${c.location} for ${g()}`)}},bi=c=>{switch(c[3]){case"cpu":return new We(c[0],c[2],c[1]);case"gpu-buffer":{let g=c[0];if(!Fr(g))throw new Error(`not supported data type: ${g} for deserializing GPU tensor`);let{gpuBuffer:b,download:I,dispose:S}=c[2];return We.fromGpuBuffer(b,{dataType:g,dims:c[1],download:I,dispose:S})}case"ml-tensor":{let g=c[0];if(!Wr(g))throw new Error(`not supported data type: ${g} for deserializing MLTensor tensor`);let{mlTensor:b,download:I,dispose:S}=c[2];return We.fromMLTensor(b,{dataType:g,dims:c[1],download:I,dispose:S})}default:throw new Error(`invalid data location: ${c[3]}`)}},$i=class{async fetchModelAndCopyToWasmMemory(c){return ta(await Gr(c))}async loadModel(c,g){lt();let b;typeof c=="string"?b=await this.fetchModelAndCopyToWasmMemory(c):b=c,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await ra(b,g),ot()}async dispose(){return Ea(this.sessionId)}async run(c,g,b){lt();let I=[],S=[];Object.entries(c).forEach(K=>{let U=K[0],ne=K[1],A=this.inputNames.indexOf(U);if(A===-1)throw new Error(`invalid input '${U}'`);I.push(ne),S.push(A)});let R=[],C=[];Object.entries(g).forEach(K=>{let U=K[0],ne=K[1],A=this.outputNames.indexOf(U);if(A===-1)throw new Error(`invalid output '${U}'`);R.push(ne),C.push(A)});let k=I.map((K,U)=>na(K,()=>`input "${this.inputNames[S[U]]}"`)),M=R.map((K,U)=>K?na(K,()=>`output "${this.outputNames[C[U]]}"`):null),F=await wr(this.sessionId,S,k,C,M,b),j={};for(let K=0;K<F.length;K++)j[this.outputNames[C[K]]]=R[K]??bi(F[K]);return ot(),j}startProfiling(){}endProfiling(){ia(this.sessionId)}}}),Kr={};ce(Kr,{OnnxruntimeWebAssemblyBackend:()=>Si,initializeFlags:()=>xi,wasmBackend:()=>Ti});var xi,Si,Ti,sa=E(()=>{ct(),aa(),vi(),xi=()=>{(typeof Q.wasm.initTimeout!="number"||Q.wasm.initTimeout<0)&&(Q.wasm.initTimeout=0);let c=Q.wasm.simd;if(typeof c!="boolean"&&c!==void 0&&c!=="fixed"&&c!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${c}". Reset it to \`false\` and ignore SIMD feature checking.`),Q.wasm.simd=!1),typeof Q.wasm.proxy!="boolean"&&(Q.wasm.proxy=!1),typeof Q.wasm.trace!="boolean"&&(Q.wasm.trace=!1),typeof Q.wasm.numThreads!="number"||!Number.isInteger(Q.wasm.numThreads)||Q.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)Q.wasm.numThreads=1;else{let g=typeof navigator>"u"?re("node:os").cpus().length:navigator.hardwareConcurrency;Q.wasm.numThreads=Math.min(4,Math.ceil((g||1)/2))}},Si=class{async init(c){xi(),await _i(),await wi(c)}async createInferenceSessionHandler(c,g){let b=new $i;return await b.loadModel(c,g),b}},Ti=new Si}),oa={};ce(oa,{InferenceSession:()=>kr,TRACE:()=>Jt,TRACE_FUNC_BEGIN:()=>lt,TRACE_FUNC_END:()=>ot,Tensor:()=>We,default:()=>nn,env:()=>Q,registerBackend:()=>le}),ct(),ct(),ct();var Ia="1.22.0",nn=Ri;{let c=(sa(),Ee(Kr)).wasmBackend;le("cpu",c,10),le("wasm",c,10)}return Object.defineProperty(Q.versions,"web",{value:Ia,enumerable:!0}),Ee(oa)})();v.exports=W})(vc);var eh=vc.exports;(function(v){var O=vt&&vt.__createBinding||(Object.create?function(Y,ue,ie,q){q===void 0&&(q=ie);var ae=Object.getOwnPropertyDescriptor(ue,ie);(!ae||("get"in ae?!ue.__esModule:ae.writable||ae.configurable))&&(ae={enumerable:!0,get:function(){return ue[ie]}}),Object.defineProperty(Y,q,ae)}:function(Y,ue,ie,q){q===void 0&&(q=ie),Y[q]=ue[ie]}),W=vt&&vt.__setModuleDefault||(Object.create?function(Y,ue){Object.defineProperty(Y,"default",{enumerable:!0,value:ue})}:function(Y,ue){Y.default=ue}),H=vt&&vt.__importStar||function(Y){if(Y&&Y.__esModule)return Y;var ue={};if(Y!=null)for(var ie in Y)ie!=="default"&&Object.prototype.hasOwnProperty.call(Y,ie)&&O(ue,Y,ie);return W(ue,Y),ue};Object.defineProperty(v,"__esModule",{value:!0}),v.MicVAD=v.getDefaultRealTimeVADOptions=v.ort=v.DEFAULT_MODEL=void 0;const X=H(eh),D=Ci,se=sr,re=Er,E=li,ce=ms,$e=Ta;v.DEFAULT_MODEL="legacy",v.ort=X;const Ee="vad.worklet.bundle.min.js",fe="silero_vad_v5.onnx",ve="silero_vad_legacy.onnx",le=Y=>({...se.defaultFrameProcessorOptions,onFrameProcessed:()=>{},onVADMisfire:()=>{re.log.debug("VAD misfire")},onSpeechStart:()=>{re.log.debug("Detected speech start")},onSpeechEnd:()=>{re.log.debug("Detected speech end")},onSpeechRealStart:()=>{re.log.debug("Detected real speech start")},baseAssetPath:"./",onnxWASMBasePath:"./",model:Y,workletOptions:{},getStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),pauseStream:async ue=>{ue.getTracks().forEach(ie=>{ie.stop()})},resumeStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),ortConfig:ue=>{ue.env.logLevel="error"},startOnLoad:!0,processorType:"auto"});v.getDefaultRealTimeVADOptions=le;const xe=Y=>"audioWorklet"in Y&&typeof AudioWorkletNode=="function"?"AudioWorklet":"ScriptProcessor";async function Le(Y,ue,ie,q,ae){await ie.audioWorklet.addModule(Y),ue.processorOptions={...ue.processorOptions??{},frameSamples:q};const Q=new AudioWorkletNode(ie,"vad-helper-worklet",ue);return Q.port.onmessage=async Ne=>{const Ce=Ne.data;if(!(typeof Ce=="object"&&Ce&&"message"in Ce)){console.error("Invalid message event",Ce);return}switch(Ce.message){case E.Message.AudioFrame:{if(!("data"in Ce&&Ce.data instanceof ArrayBuffer)){console.log("Audio frame message has no data");return}const qe=new Float32Array(Ce.data);await ae(qe);break}}},Q}async function Ge(Y,ue,ie){const q=new $e.Resampler({nativeSampleRate:Y.sampleRate,targetSampleRate:16e3,targetFrameSize:ue});re.log.debug("using script processor");const Q=Y.createScriptProcessor(4096,1,1);let Ne=!1;return Q.onaudioprocess=async Ce=>{if(!Ne){Ne=!0;try{const qe=Ce.inputBuffer.getChannelData(0);Ce.outputBuffer.getChannelData(0).fill(0);const Xe=q.process(qe);for(const ut of Xe)await ie(ut)}catch(qe){console.error("Error processing audio:",qe)}finally{Ne=!1}}},Q.connect(Y.destination),Q}class Ie{constructor(ue,ie,q,ae,Q=!1,Ne=null,Ce=null,qe=null,yt=null,Xe=null,ut=null,st="uninitialized",It=!1){this.options=ue,this.frameProcessor=ie,this.model=q,this.frameSamples=ae,this.listening=Q,this.errored=Ne,this._stream=Ce,this._audioContext=qe,this._vadNode=yt,this._mediaStreamAudioSourceNode=Xe,this._audioProcessorAdapterType=ut,this.initializationState=st,this.ownsAudioContext=It,this.getAudioInstances=()=>{if(this._stream===null||this._audioContext===null||this._vadNode==null||this._mediaStreamAudioSourceNode==null)throw new Error("MicVAD has null stream, audio context, or processor adapter");return{stream:this._stream,audioContext:this._audioContext,vadNode:this._vadNode,mediaStreamAudioSourceNode:this._mediaStreamAudioSourceNode}},this.setErrored=Ve=>{this.initializationState="errored",this.errored=Ve},this.start=async()=>{switch(this.initializationState){case"uninitialized":{re.log.debug("initializing micVAD"),this.initializationState="initializing",this.frameProcessor.resume();try{this._stream=await this.options.getStream()}catch(Ve){throw Ve instanceof Error?this.setErrored(Ve.message):this.setErrored(String(Ve)),Ve}if(this.options.audioContext?(console.log("using custom audio context"),this._audioContext=this.options.audioContext):(console.log("using default audio context"),this._audioContext=new AudioContext,this.ownsAudioContext=!0),!this._audioContext)throw this.setErrored("Audio context is null"),Error("Audio context is null");switch(this._audioProcessorAdapterType=this.options.processorType=="auto"?xe(this._audioContext):this.options.processorType,this._audioProcessorAdapterType){case"AudioWorklet":this._vadNode=await Le(this.options.baseAssetPath+Ee,this.options.workletOptions,this._audioContext,this.frameSamples,this.processFrame);break;case"ScriptProcessor":this._vadNode=await Ge(this._audioContext,this.frameSamples,this.processFrame);break;default:throw new Error(`Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`)}this._mediaStreamAudioSourceNode=new MediaStreamAudioSourceNode(this._audioContext,{mediaStream:this._stream}),this._mediaStreamAudioSourceNode.connect(this._vadNode),re.log.debug("started micVAD"),this.listening=!0,this.initializationState="initialized";break}case"initializing":{re.log.warn("start called while initializing");break}case"initialized":{if(this.listening)return;this.listening=!0,this.frameProcessor.resume();const{stream:Ve,audioContext:wt,vadNode:or}=this.getAudioInstances();this._stream=await this.options.resumeStream(Ve);const rt=new MediaStreamAudioSourceNode(wt,{mediaStream:this._stream});this._mediaStreamAudioSourceNode=rt,rt.connect(or);break}case"destroyed":{re.log.warn("start called after destroyed");break}case"errored":{re.log.error("start called after errored");break}default:{re.log.warn("weird initialization state");break}}},this.pause=async()=>{if(!this.listening)return;this.listening=!1;const{stream:Ve,mediaStreamAudioSourceNode:wt}=this.getAudioInstances();await this.options.pauseStream(Ve),wt.disconnect(),this.frameProcessor.pause(this.handleFrameProcessorEvent)},this.destroy=async()=>{var wt;re.log.debug("destroy called"),this.initializationState="destroyed";const{vadNode:Ve}=this.getAudioInstances();Ve instanceof AudioWorkletNode&&Ve.port.postMessage(E.Message.SpeechStop),this.listening&&await this.pause(),await this.model.release(),this.ownsAudioContext&&await((wt=this._audioContext)==null?void 0:wt.close())},this.setOptions=Ve=>{this.frameProcessor.setOptions(Ve)},this.processFrame=async Ve=>{await this.frameProcessor.process(Ve,this.handleFrameProcessorEvent)},this.handleFrameProcessorEvent=Ve=>{switch(Ve.msg){case E.Message.FrameProcessed:this.options.onFrameProcessed(Ve.probs,Ve.frame);break;case E.Message.SpeechStart:this.options.onSpeechStart();break;case E.Message.SpeechRealStart:this.options.onSpeechRealStart();break;case E.Message.VADMisfire:this.options.onVADMisfire();break;case E.Message.SpeechEnd:this.options.onSpeechEnd(Ve.audio);break}}}static async new(ue={}){const ie={...(0,v.getDefaultRealTimeVADOptions)(ue.model??v.DEFAULT_MODEL),...ue};(0,se.validateOptions)(ie),v.ort.env.wasm.wasmPaths=ie.onnxWASMBasePath,ie.ortConfig!==void 0&&ie.ortConfig(v.ort);const q=ie.model==="v5"?fe:ve,ae=ie.baseAssetPath+q,Q=ie.model==="v5"?ce.SileroV5.new:ce.SileroLegacy.new;let Ne;try{Ne=await Q(v.ort,()=>(0,D.defaultModelFetcher)(ae))}catch(ut){throw console.error(`Encountered an error while loading model file ${ae}`),ut}const Ce=ie.model==="v5"?512:1536,qe=Ce/16,yt=new se.FrameProcessor(Ne.process,Ne.reset_state,{positiveSpeechThreshold:ie.positiveSpeechThreshold,negativeSpeechThreshold:ie.negativeSpeechThreshold,redemptionMs:ie.redemptionMs,preSpeechPadMs:ie.preSpeechPadMs,minSpeechMs:ie.minSpeechMs,submitUserSpeechOnPause:ie.submitUserSpeechOnPause},qe),Xe=new Ie(ie,yt,Ne,Ce);if(ie.startOnLoad)try{await Xe.start()}catch(ut){throw console.error("Error starting micVad",ut),ut}return Xe}}v.MicVAD=Ie})($c);(function(v){Object.defineProperty(v,"__esModule",{value:!0}),v.getDefaultRealTimeVADOptions=v.MicVAD=v.DEFAULT_MODEL=v.utils=v.NonRealTimeVAD=v.Message=v.FrameProcessor=v.defaultModelFetcher=v.baseAssetPath=void 0;var O=Sa;Object.defineProperty(v,"baseAssetPath",{enumerable:!0,get:function(){return O.baseAssetPath}});var W=Ci;Object.defineProperty(v,"defaultModelFetcher",{enumerable:!0,get:function(){return W.defaultModelFetcher}});var H=sr;Object.defineProperty(v,"FrameProcessor",{enumerable:!0,get:function(){return H.FrameProcessor}});var X=li;Object.defineProperty(v,"Message",{enumerable:!0,get:function(){return X.Message}});var D=fc;Object.defineProperty(v,"NonRealTimeVAD",{enumerable:!0,get:function(){return D.NonRealTimeVAD}});const se=nr;v.utils={audioFileToArray:se.audioFileToArray,minFramesForTargetMS:se.minFramesForTargetMS,arrayBufferToBase64:se.arrayBufferToBase64,encodeWAV:se.encodeWAV};var re=$c;Object.defineProperty(v,"DEFAULT_MODEL",{enumerable:!0,get:function(){return re.DEFAULT_MODEL}}),Object.defineProperty(v,"MicVAD",{enumerable:!0,get:function(){return re.MicVAD}}),Object.defineProperty(v,"getDefaultRealTimeVADOptions",{enumerable:!0,get:function(){return re.getDefaultRealTimeVADOptions}})})(pc);function th(v){if(!(v instanceof Float32Array))throw new TypeError("samples 必须为 Float32Array");const O=new ArrayBuffer(v.length*2),W=new DataView(O);for(let H=0;H<v.length;H+=1){const X=Math.max(-1,Math.min(1,v[H])),D=X<0?Math.round(X*32768):Math.round(X*32767);W.setInt16(H*2,D,!0)}return O}const Sc=16e3,Tr=Math.round(Sc*.12),oc=Sc*30,oi=()=>{};function rh(v){const O=String(v);return`${O.startsWith("/")?O:`/${O}`}${O.endsWith("/")?"":"/"}`}function ih(v={},O={}){const W=v.onSpeechStart||oi,H=v.onPcm||oi,X=v.onSpeechEnd||oi,D=v.onMisfire||oi,se=v.onError||oi,re=O.getUserMedia||(je=>navigator.mediaDevices.getUserMedia(je)),E=O.createAudioContext||(()=>new AudioContext),ce=O.createWorkletNode||(je=>new AudioWorkletNode(je,"pcm-capture",{numberOfInputs:1,numberOfOutputs:0,channelCount:1})),$e=O.createVad||(je=>pc.MicVAD.new(je)),Ee=rh(O.baseUrl||"./"),fe=`${Ee}vad/`,ve=`${Ee}voice/pcm-capture.worklet.js`;let le=null,xe=null,Le=null,Ge=null,Ie=null,Y=!1,ue=!1,ie=!1,q=!1,ae=0,Q=null,Ne=Promise.resolve();const Ce=new Float32Array(Tr);let qe=0,yt=0;function Xe(je){for(const Be of je)Ce[yt]=Be,yt=(yt+1)%Tr,qe=Math.min(Tr,qe+1)}function ut(){const je=new Float32Array(Tr),Be=Tr-qe,St=(yt-qe+Tr)%Tr;for(let We=0;We<qe;We+=1)je[Be+We]=Ce[(St+We)%Tr];return je}function st(je){je.length&&(H(th(je)),ae+=je.length)}function It(){return q?(q=!1,X(),!0):!1}async function Ve(){!Ie||!ue||ie||(await Ie.pause(),ue&&!ie&&await Ie.start())}function wt(je){try{if(!ue||ie)return;const Be=je==null?void 0:je.data,St=Be instanceof Float32Array?Be:Be instanceof ArrayBuffer?new Float32Array(Be):null;if(!St)throw new TypeError("Worklet 必须发送 Float32Array 或 ArrayBuffer");if(Xe(St),!q)return;const We=oc-ae;We>0&&st(St.length<=We?St:St.subarray(0,We)),ae>=oc&&(It(),Q||(Q=Ve().catch(se).finally(()=>{Q=null})))}catch(Be){se(Be)}}function or(){!ue||ie||q||(q=!0,ae=0,W(),st(ut()))}function rt(){It()}function xt(){q&&(q=!1,D())}async function ee(){le=await re({audio:{channelCount:1,echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}}),xe=E(),await xe.audioWorklet.addModule(ve),Ge=ce(xe),Ge.port.onmessage=wt,Le=xe.createMediaStreamSource(le),Le.connect(Ge),Ie=await $e({model:"v5",redemptionMs:400,minSpeechMs:250,preSpeechPadMs:120,baseAssetPath:fe,onnxWASMBasePath:fe,audioContext:xe,startOnLoad:!1,getStream:async()=>le,pauseStream:async()=>{},resumeStream:async()=>le,onSpeechStart:or,onSpeechEnd:rt,onVADMisfire:xt}),Y=!0}async function Ye(){if(ie)throw new Error("语音采集器已销毁");if(!ue)try{Y||await ee(),xe.state==="suspended"&&await xe.resume(),await Ie.start(),ue=!0}catch(je){throw se(je),await kt().catch(se),je}}async function Bt(){!Y||!ue||(ue=!1,It(),await Ie.pause(),xe.state!=="closed"&&await xe.suspend())}async function kt(){ie||(ie=!0,ue=!1,q=!1,Q&&await Q.catch(oi),Ie&&(await Ie.pause(),await Ie.destroy()),Le&&Le.disconnect(),Ge&&(Ge.port.onmessage=null,Ge.disconnect()),xe&&xe.state!=="closed"&&await xe.close(),le&&le.getTracks().forEach(je=>je.stop()))}function ur(je){const Be=Ne.then(je,je);return Ne=Be.catch(oi),Be}return{start:()=>ur(Ye),pause:()=>ur(Bt),destroy:()=>ur(kt)}}const ah=new Set(["vad_endpoint","first_audio","buffer_depth","starvation","barge_in_stop"]),nh=new Set(["started","completed","accepted","cancelled","stale","underflow","error"]),sh=["turn_id","sequence","byte_count"];function va(v,O){return Reflect.get(v,O)}function oh(v){if(!v||typeof v!="object")return null;try{const O=va(v,"stage");if(!ah.has(O))return null;const W={stage:O},H=va(v,"session_id");typeof H=="string"&&H.length&&(W.session_id=H.slice(0,8));const X=va(v,"status");nh.has(X)&&(W.status=X);for(const se of sh){const re=va(v,se);Number.isSafeInteger(re)&&re>=0&&(W[se]=re)}const D=va(v,"duration_ms");return typeof D=="number"&&Number.isFinite(D)&&D>=0&&(W.duration_ms=Math.round(D*1e3)/1e3),Object.freeze(W)}catch{return null}}function uh(v=O=>console.info("[VoiceCallMetric]",O)){return O=>{try{const W=oh(O);W&&v(W)}catch{}}}function lh(v={}){const O=v.documentImpl||(typeof document>"u"?null:document),W=v.now||(()=>performance.now()),H=uh(v.reportMetric),X=new Set;let D=Object.freeze({state:"ended",sessionId:null,activeTurnId:null,muted:!1,transcript:"",assistantText:"",error:null});const se=(ee,Ye={})=>{ee==="pcm_playback_underflow"&&H({session_id:D==null?void 0:D.sessionId,turn_id:Ye.turn_id,sequence:Ye.sequence,stage:"starvation",status:"underflow",duration_ms:Ye.gap_ms})},re=v.player||(v.createPlayer||Df)({...v.playerDependencies,reportMetric:se});let E=0,ce=0,$e=!1,Ee=!1,fe=!1,ve=!1,le=null,xe=null,Le=0,Ge=null,Ie=null;function Y(ee){D=Object.freeze({...D,...ee});for(const Ye of X)Ye(D)}function ue(ee){Y({state:"error",error:ee instanceof Error?ee.message:String(ee)})}function ie(ee){return Number.isSafeInteger(ee.turn_id)&&ee.turn_id===D.activeTurnId&&ee.session_id===D.sessionId&&D.state!=="ended"}function q(){const ee=D.activeTurnId;if(!ee||!D.sessionId)return;const Ye=W(),Bt=re.interrupt(ee);H({session_id:D.sessionId,turn_id:ee,stage:"barge_in_stop",status:Bt!=null&&Bt.accepted?"completed":"stale",duration_ms:Math.max(0,W()-Ye)}),st.sendInterrupt(D.sessionId,ee)}function ae(){!D.sessionId||D.muted||fe||D.state==="connecting"||D.state==="ended"||(D.activeTurnId!==null&&q(),E+=1,ce=0,$e=!0,xe=W(),Le=0,Ge=null,Ie=null,st.sendSpeechStart(D.sessionId,E),Y({state:"listening",activeTurnId:E,transcript:"",assistantText:"",error:null}))}function Q(ee){if(!$e||D.muted||!D.sessionId||D.activeTurnId===null)return;st.sendAudio(D.sessionId,D.activeTurnId,ce,ee).accepted&&(ce+=1,Number.isSafeInteger(ee==null?void 0:ee.byteLength)&&(Le+=ee.byteLength))}function Ne(){if(!$e||!D.sessionId||D.activeTurnId===null)return;$e=!1,st.sendSpeechEnd(D.sessionId,D.activeTurnId);const ee=W();H({session_id:D.sessionId,turn_id:D.activeTurnId,stage:"vad_endpoint",status:"completed",duration_ms:xe===null?0:Math.max(0,ee-xe),byte_count:Le}),Ge=ee,Y({state:"recognizing"})}function Ce(){$e&&($e=!1,H({session_id:D.sessionId,turn_id:D.activeTurnId,stage:"vad_endpoint",status:"cancelled",duration_ms:xe===null?0:Math.max(0,W()-xe),byte_count:Le}),q(),Y({state:"listening",activeTurnId:null}))}const qe=v.capture||(v.createCapture||ih)({onSpeechStart:ae,onPcm:Q,onSpeechEnd:Ne,onMisfire:Ce,onError:ue},v.captureDependencies);async function yt(ee){if(ee.type==="call_ready"){if(D.state!=="connecting"||D.sessionId)return;Y({sessionId:ee.session_id}),await qe.start(),Y({state:"listening"});return}if(ee.type==="call_ended"){if(ee.session_id!==D.sessionId)return;fe=!0,$e=!1,It(),await Ve(),st.disconnect(),Y({state:"ended",activeTurnId:null,sessionId:null});return}ie(ee)&&(ee.type==="transcript_final"?Y({state:"thinking",transcript:ee.text}):ee.type==="assistant_text_delta"?Y({state:"thinking",assistantText:`${D.assistantText}${ee.text}`}):ee.type==="tts_start"?(re.start(ee.turn_id,{sample_rate:ee.sample_rate,channels:ee.channels,sample_width:ee.sample_width}),Y({state:"speaking"})):ee.type==="tts_end"?(re.seal(ee.turn_id),Y({state:"listening"})):ee.type==="turn_cancelled"?(re.interrupt(ee.turn_id),Y({state:"interrupted",activeTurnId:null})):ee.type==="call_error"&&(re.interrupt(ee.turn_id),Y({state:"error",activeTurnId:null,error:ee.message})))}function Xe(ee,Ye){if(!ie(ee))return;const Bt=re.enqueue(ee.turn_id,ee.sequence,Ye);if(!(Bt!=null&&Bt.accepted))return;Ie!==ee.turn_id&&(Ie=ee.turn_id,H({session_id:D.sessionId,turn_id:ee.turn_id,sequence:ee.sequence,stage:"first_audio",status:"accepted",duration_ms:Ge===null?0:Math.max(0,W()-Ge),byte_count:Ye==null?void 0:Ye.byteLength}));const kt=typeof re.snapshot=="function"?re.snapshot():null;Number.isSafeInteger(kt==null?void 0:kt.bufferedMs)&&kt.bufferedMs>=0&&H({session_id:D.sessionId,turn_id:ee.turn_id,sequence:ee.sequence,stage:"buffer_depth",status:"accepted",duration_ms:kt.bufferedMs,byte_count:Ye==null?void 0:Ye.byteLength})}async function ut(){!O||O.visibilityState!=="hidden"||fe||($e=!1,q(),await qe.pause(),Y({state:"interrupted",activeTurnId:null}))}const st=v.socket||(v.createSocket||Lf)({...v.socketDependencies,onControl:ee=>yt(ee).catch(ue),onPcm:Xe,onError:ue,onClose:()=>{!fe&&D.state!=="ended"&&(ue(new Error("语音连接已断开")),Ve())}});function It(){O&&ve&&(O.removeEventListener("visibilitychange",ut),ve=!1)}function Ve(){return le||(le=Promise.allSettled([qe.destroy(),re.destroy()])),le}async function wt(){if(fe)throw new Error("通话已经结束");if(Ee){D.state==="interrupted"&&!D.muted&&(O==null?void 0:O.visibilityState)!=="hidden"&&(await qe.start(),Y({state:"listening"}));return}Ee=!0,Y({state:"connecting",error:null}),O&&!ve&&(O.addEventListener("visibilitychange",ut),ve=!0);try{if(await st.connect(),!st.sendCallStart().accepted)throw new Error("无法开始语音通话")}catch(ee){throw ue(ee),ee}}async function or(){if(fe||!Ee)return D.muted;const ee=!D.muted;return Y({muted:ee}),ee?($e=!1,q(),await qe.pause(),Y({state:"interrupted",activeTurnId:null})):(O==null?void 0:O.visibilityState)!=="hidden"&&(await qe.start(),Y({state:"listening"})),ee}async function rt(){fe||(fe=!0,$e=!1,It(),D.activeTurnId!==null&&re.interrupt(D.activeTurnId),D.sessionId&&st.sendCallEnd(D.sessionId),await Ve(),st.disconnect(),Y({state:"ended",activeTurnId:null,sessionId:null}))}function xt(ee){return X.add(ee),ee(D),()=>X.delete(ee)}return{start:wt,end:rt,toggleMute:or,subscribe:xt,snapshot:()=>D}}const dh=Object.freeze({state:"ended",transcript:"",assistantText:"",error:null,muted:!1});function ph(v){const O=mr.useRef(null),W=mr.useRef(null),[H,X]=mr.useState(dh),D=mr.useCallback(()=>{if(!O.current){const $e=lh();O.current=$e,W.current=$e.subscribe(X)}return O.current},[]),se=mr.useCallback(async()=>{v&&await D().start()},[v,D]),re=mr.useCallback(async()=>{var Ee;const $e=O.current;$e&&(await $e.end(),(Ee=W.current)==null||Ee.call(W),W.current=null,O.current=null)},[]),E=mr.useCallback(async()=>{O.current&&await O.current.start()},[]),ce=mr.useCallback(async()=>{O.current&&await O.current.toggleMute()},[]);return mr.useEffect(()=>()=>{var $e,Ee;($e=W.current)==null||$e.call(W),(Ee=O.current)==null||Ee.end()},[]),{status:H.state,userTranscript:H.transcript,assistantText:H.assistantText,error:H.error||"",muted:H.muted,startCall:se,endCall:re,continueCall:E,toggleMute:ce}}const ch={connecting:"正在连接 UNA",listening:"UNA 正在倾听",recognizing:"正在识别你的话",thinking:"UNA 正在思考",speaking:"UNA 正在说话",interrupted:"通话已暂停",error:"通话遇到问题",ended:"准备好后开始通话"};function mh({authenticated:v}){const O=ph(v),W=!["ended","error"].includes(O.status);return pt.jsxs("main",{className:"voice-call-page",children:[pt.jsx("a",{className:"voice-call-back",href:"./",children:"返回 UNA"}),pt.jsxs("section",{className:"voice-call-card","aria-label":"UNA 实时语音通话",children:[pt.jsx("div",{className:`voice-call-orb voice-call-orb--${O.status}`,"aria-hidden":"true",children:"UNA"}),pt.jsx("p",{className:"voice-call-status","aria-live":"polite",children:ch[O.status]||"UNA 实时语音"}),O.error&&pt.jsx("p",{className:"voice-call-error",role:"alert",children:O.error}),pt.jsxs("div",{className:"voice-call-transcript","aria-live":"polite",children:[O.userTranscript&&pt.jsxs("p",{children:[pt.jsx("span",{children:"你"}),O.userTranscript]}),O.assistantText&&pt.jsxs("p",{children:[pt.jsx("span",{children:"UNA"}),O.assistantText]})]}),pt.jsxs("div",{className:"voice-call-actions",children:[O.status==="ended"&&pt.jsx("button",{className:"voice-call-primary",onClick:O.startCall,children:"开始通话"}),O.status==="interrupted"&&!O.muted&&pt.jsx("button",{className:"voice-call-primary",onClick:O.continueCall,children:"继续通话"}),W&&pt.jsx("button",{className:"voice-call-round",onClick:O.toggleMute,"aria-label":O.muted?"取消静音":"静音麦克风",children:O.muted?pt.jsx(If,{}):pt.jsx(Ef,{})}),O.status!=="ended"&&pt.jsx("button",{className:"voice-call-round voice-call-round--danger",onClick:O.endCall,"aria-label":"结束通话",children:pt.jsx(kf,{})})]})]})]})}export{mh as default};
