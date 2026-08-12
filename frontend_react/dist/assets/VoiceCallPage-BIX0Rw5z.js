import{c as vc,b as Af,g as Of,r as ar,j as lt}from"./index-D5QR6pT_.js";import{M as Rf}from"./mic-BvjmQVeR.js";/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mf=vc("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bf=vc("PhoneOff",[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91",key:"z86iuo"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22",key:"11kh81"}]]),Df=.12,Pf=.03,Uf=.01,Nf=.008,Lf=4095,ps=()=>{};function qf(I){if(!Number.isSafeInteger(I)||I<=0)throw new TypeError("turnId 必须为正安全整数")}function Vf(I){if(!I||typeof I!="object")throw new TypeError("PCM format 必须为对象");if(!Number.isSafeInteger(I.sample_rate)||I.sample_rate<8e3||I.sample_rate>48e3)throw new RangeError("sample_rate 必须在 8000..48000");if(I.channels!==1)throw new RangeError("channels 必须为 1");if(I.sample_width!==2)throw new RangeError("sample_width 必须为 2");return Object.freeze({sample_rate:I.sample_rate,channels:1,sample_width:2})}function Ff(I){let M;if(I instanceof ArrayBuffer)M=new Uint8Array(I);else if(ArrayBuffer.isView(I))M=new Uint8Array(I.buffer,I.byteOffset,I.byteLength);else throw new TypeError("PCM 必须为 ArrayBuffer 或 TypedArray");if(!M.byteLength||M.byteLength%2)throw new RangeError("PCM16 必须为非空偶数字节");return M.slice().buffer}function Wf(I={}){const M=I.createAudioContext||(()=>new AudioContext),Y=I.now||(()=>performance.now()),te=I.reportMetric||ps;let L=null,H=null,re=!1,Z=Promise.resolve();function T(){return L||(L=M()),L}function ee(N){for(const se of N.sources)try{se.stop()}catch{}N.sources.clear()}function me(N){H&&(H.active=!1,H.status=N,H.pending.clear(),ee(H))}function de(N,se,K){const Ue=se.byteLength/2,Ae=L.createBuffer(1,Ue,N.format.sample_rate),Le=Ae.getChannelData(0),ot=new DataView(se);for(let We=0;We<Ue;We+=1)Le[We]=ot.getInt16(We*2,!0)/32768;return Ae.__voiceSequence=K,Ae}function ue(N){let se=N.expectedSequence,K=0;for(;N.pending.has(se);)K+=N.pending.get(se).byteLength/2,se+=1;return K}function pe(N){if(!(!N.active||H!==N)){if(!N.playbackBegun){const se=ue(N),K=Math.ceil(N.format.sample_rate*Df);if(!N.sealed&&se<K||!se)return;N.playbackBegun=!0,N.nextStartAt=L.currentTime+Pf}for(;N.active&&N.pending.has(N.expectedSequence);){const se=N.expectedSequence,K=N.pending.get(se);N.pending.delete(se);const Ue=L.currentTime>N.nextStartAt;Ue&&te("pcm_playback_underflow",{turn_id:N.turnId,sequence:se,gap_ms:Math.round((L.currentTime-N.nextStartAt)*1e3),at_ms:Y()});const Ae=de(N,K,se),Le=L.createBufferSource();Le.buffer=Ae,Le.__voiceSequence=se;const ot=Math.max(N.nextStartAt,L.currentTime+Uf);if(Ue&&typeof L.createGain=="function"){const We=L.createGain();We.gain.setValueAtTime(0,ot),We.gain.linearRampToValueAtTime(1,ot+Nf),Le.connect(We),We.connect(L.destination)}else Le.connect(L.destination);Le.onended=()=>{N.sources.delete(Le),N.active&&N.sealed&&!N.pending.size&&!N.sources.size&&(N.status="completed")},N.sources.add(Le),Le.start(ot),N.nextStartAt=ot+Ae.duration,N.expectedSequence+=1,N.status=N.sealed?"sealed":"playing"}N.sealed&&!N.pending.size&&!N.sources.size&&(N.status="completed")}}function le(N){return Z=Z.catch(ps).then(async()=>{!N.active||H!==N||re||(L.state==="suspended"&&await L.resume(),pe(N))}),Z}function ne(N){le(N).catch(se=>{te("pcm_playback_error",{turn_id:N.turnId,message:se instanceof Error?se.message:String(se),at_ms:Y()})})}function ke(N,se){if(re)throw new Error("PCM 播放器已销毁");qf(N);const K=Vf(se);return T(),me("superseded"),H={turnId:N,format:K,active:!0,status:"buffering",sealed:!1,playbackBegun:!1,expectedSequence:0,seenSequences:new Set,pending:new Map,sources:new Set,nextStartAt:0},{accepted:!0}}function Me(N,se,K){if(!H||!H.active||H.turnId!==N)return{accepted:!1,reason:"stale"};if(H.sealed)return{accepted:!1,reason:"sealed"};if(!Number.isSafeInteger(se)||se<0||se>Lf)return{accepted:!1,reason:"invalid_sequence"};if(H.seenSequences.has(se))return{accepted:!1,reason:"duplicate"};let Ue;try{Ue=Ff(K)}catch(Ae){return{accepted:!1,reason:"invalid_pcm",error:Ae}}return H.seenSequences.add(se),H.pending.set(se,Ue),H.status="buffering",ne(H),{accepted:!0}}function Ie(N){if(!H||!H.active||H.turnId!==N)return{accepted:!1,reason:"stale"};H.sealed=!0,H.status="sealed";const K=[...H.pending.keys()].sort((Ae,Le)=>Ae-Le).at(-1);let Ue=null;if(K!==void 0){for(let Ae=H.expectedSequence;Ae<=K;Ae+=1)if(!H.seenSequences.has(Ae)){Ue=Ae;break}}return Ue!==null&&(H.status="sequence_gap",te("pcm_sequence_gap",{turn_id:N,expected_sequence:Ue,at_ms:Y()})),ne(H),Ue===null?{accepted:!0}:{accepted:!1,reason:"missing_sequence",expected_sequence:Ue}}function Q(N){return!H||H.turnId!==N||!H.active?{accepted:!1,reason:"stale"}:(me("interrupted"),{accepted:!0})}async function fe(){re||(re=!0,me("destroyed"),await Z.catch(ps),L&&L.state!=="closed"&&await L.close())}function oe(){if(!H)return Object.freeze({status:re?"destroyed":"idle"});const N=[...H.pending.values()].reduce((se,K)=>se+K.byteLength/2,0);return Object.freeze({turnId:H.turnId,status:H.status,active:H.active,sealed:H.sealed,expectedSequence:H.expectedSequence,pendingSequences:Object.freeze([...H.pending.keys()].sort((se,K)=>se-K)),bufferedMs:Math.round(N/H.format.sample_rate*1e3),nextStartAt:H.nextStartAt})}return{start:ke,enqueue:Me,seal:Ie,interrupt:Q,destroy:fe,snapshot:oe,whenScheduled:()=>Z}}const ec=65536,xc=4095,Gf=9007199254740991,Ka=8192,tc=Object.freeze({call_start:[],user_speech_start:["session_id","turn_id"],input_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],user_speech_end:["session_id","turn_id"],interrupt:["session_id","turn_id"],call_end:["session_id"],pong:[]}),rc=Object.freeze({call_ready:["session_id"],transcript_final:["session_id","turn_id","text"],assistant_text_delta:["session_id","turn_id","text"],assistant_text_end:["session_id","turn_id"],tts_start:["session_id","turn_id","sample_rate","channels","sample_width"],tts_end:["session_id","turn_id"],output_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],turn_ignored:["session_id","turn_id","reason","message"],turn_cancelled:["session_id","turn_id","reason"],call_error:["session_id","turn_id","code","message"],call_ended:["session_id"]});function rt(I){return new Error(I)}function gs(I){return I!==null&&typeof I=="object"&&!Array.isArray(I)}function ui(I,M){if(typeof I!="string"||!I.trim())throw rt(`${M} 不能为空`);return I}function ys(I,M){if(!Number.isSafeInteger(I)||I<=0||I>Gf)throw rt(`${M} 必须为正整数`);return I}function _s(I,M){const Y=new Set(M),te=Object.keys(I);if(te.some(L=>!Y.has(L)))throw rt("控制消息含未知字段");if(te.length!==Y.size)throw rt("控制消息缺少字段")}function Sc(I){if(!gs(I))throw rt("二进制帧头必须是对象");_s(I,["session_id","direction","turn_id","sequence","byte_length"]);const M=ui(I.session_id,"session_id");if(I.direction!=="input"&&I.direction!=="output")throw rt("direction 必须为 input 或 output");const Y=ys(I.turn_id,"turn_id");if(!Number.isSafeInteger(I.sequence)||I.sequence<0||I.sequence>xc)throw rt("sequence 超出范围");if(!Number.isSafeInteger(I.byte_length)||I.byte_length<=0||I.byte_length>ec)throw rt(`byte_length 必须在 1..${ec}`);if(I.byte_length%2)throw rt("PCM16 必须为偶数字节");return Object.freeze({session_id:M,direction:I.direction,turn_id:Y,sequence:I.sequence,byte_length:I.byte_length})}function jf(I){if(!gs(I))throw rt("控制消息必须是对象");if(typeof I.type!="string"||!Object.hasOwn(tc,I.type))throw rt("未知事件类型");const M=tc[I.type];_s(I,["type",...M]);const Y={type:I.type};if(M.includes("session_id")&&(Y.session_id=ui(I.session_id,"session_id")),M.includes("turn_id")&&(Y.turn_id=ys(I.turn_id,"turn_id")),M.includes("direction")){if(I.direction!=="input")throw rt("direction 必须为 input");Y.direction="input"}if(M.includes("sequence")){if(!Number.isSafeInteger(I.sequence)||I.sequence<0||I.sequence>xc)throw rt("sequence 超出范围");Y.sequence=I.sequence}return M.includes("byte_length")&&(Y.byte_length=Sc({session_id:Y.session_id,direction:Y.direction,turn_id:Y.turn_id,sequence:Y.sequence,byte_length:I.byte_length}).byte_length),Y}function ic(I,M={}){const Y=JSON.stringify(jf({type:I,...M}));if(new TextEncoder().encode(Y).byteLength>Ka)throw rt(`控制消息不能超过 ${Ka} 字节`);return Y}function Hf(I){if(typeof I!="string")throw rt("控制消息必须是字符串");if(new TextEncoder().encode(I).byteLength>Ka)throw rt(`控制消息不能超过 ${Ka} 字节`);let M;try{M=JSON.parse(I)}catch{throw rt("控制消息不是合法 JSON")}if(!gs(M))throw rt("控制消息必须是对象");if(typeof M.type!="string"||!Object.hasOwn(rc,M.type))throw rt("未知事件类型");const Y=rc[M.type];_s(M,["type",...Y]);const te={type:M.type};if(Y.includes("session_id")&&(te.session_id=ui(M.session_id,"session_id")),Y.includes("turn_id")&&(te.turn_id=ys(M.turn_id,"turn_id")),Y.includes("text")&&(te.text=ui(M.text,"text")),Y.includes("reason")&&(te.reason=ui(M.reason,"reason")),Y.includes("code")&&(te.code=ui(M.code,"code")),Y.includes("message")&&(te.message=ui(M.message,"message")),M.type==="tts_start"){if(!Number.isSafeInteger(M.sample_rate)||M.sample_rate<8e3||M.sample_rate>48e3)throw rt("sample_rate 必须在 8000..48000");if(M.channels!==1)throw rt("channels 必须为 1");if(M.sample_width!==2)throw rt("sample_width 必须为 2");te.sample_rate=M.sample_rate,te.channels=M.channels,te.sample_width=M.sample_width}if(M.type==="output_audio_chunk"){const L=Sc({session_id:M.session_id,turn_id:M.turn_id,direction:M.direction,sequence:M.sequence,byte_length:M.byte_length});if(L.direction!=="output")throw rt("direction 必须为 output");te.session_id=L.session_id,te.turn_id=L.turn_id,te.direction=L.direction,te.sequence=L.sequence,te.byte_length=L.byte_length}return te}function Kf(I={}){const M=I.createTicket||(()=>Af("语音通话")),Y=I.WebSocketImpl||WebSocket,te=(I.websocketBase||Of()).replace(/\/$/,""),L=I.onControl||(()=>{}),H=I.onPcm||(()=>{}),re=I.onClose||(()=>{}),Z=I.onError||(()=>{});let T=null,ee=null,me=null,de=!1;function ue(Ie){const Q=Ie instanceof Error?Ie:new Error(String(Ie));Z(Q),me=null,T&&T.readyState<2&&T.close(1003,"protocol error")}function pe(Ie){if(de)return;const Q=Ie.data;if(typeof Q=="string"){if(me){ue("音频元数据后必须紧跟 PCM 二进制数据");return}try{const N=Hf(Q);N.type==="output_audio_chunk"?me=N:L(N)}catch(N){ue(N)}return}let fe;if(Q instanceof ArrayBuffer)fe=Q;else if(ArrayBuffer.isView(Q))fe=Q.buffer.slice(Q.byteOffset,Q.byteOffset+Q.byteLength);else{ue("语音二进制消息必须为 ArrayBuffer");return}if(!me){ue("PCM 二进制数据缺少元数据");return}const oe=me;if(me=null,fe.byteLength!==oe.byte_length){ue("PCM 长度与元数据不一致");return}H(oe,fe)}async function le(){if(de)throw new Error("语音连接已关闭");return ee||(ee=(async()=>{const Ie=await M(),Q=`${te}/ws/voice-call?ticket=${encodeURIComponent(Ie)}`;T=new Y(Q),T.binaryType="arraybuffer",await new Promise((fe,oe)=>{let N=!1;T.onopen=()=>{N=!0,fe()},T.onerror=()=>{const se=new Error("语音 WebSocket 连接失败");Z(se),N||(oe(se),T.readyState<2&&T.close(1011,"connect failed"))},T.onclose=se=>{me=null;const K=de;de=!0,re(se),!N&&!K&&oe(new Error("语音 WebSocket 在连接前关闭"))},T.onmessage=pe})})(),ee)}function ne(Ie,Q={}){return!T||T.readyState!==1||de?{accepted:!1,reason:"closed"}:(T.send(ic(Ie,Q)),{accepted:!0})}function ke(Ie,Q,fe,oe){if(!T||T.readyState!==1||de)return{accepted:!1,reason:"closed"};const N=oe instanceof ArrayBuffer?oe:ArrayBuffer.isView(oe)?oe.buffer.slice(oe.byteOffset,oe.byteOffset+oe.byteLength):null;if(!N||!N.byteLength)return{accepted:!1,reason:"invalid_pcm"};let se;try{se=ic("input_audio_chunk",{session_id:Ie,turn_id:Q,direction:"input",sequence:fe,byte_length:N.byteLength})}catch(K){return{accepted:!1,reason:"invalid_pcm",error:K}}return T.send(se),T.send(N),{accepted:!0}}function Me(Ie=1e3){de||(de=!0,me=null,T&&T.readyState<2&&T.close(Ie))}return{connect:le,sendCallStart:()=>ne("call_start"),sendSpeechStart:(Ie,Q)=>ne("user_speech_start",{session_id:Ie,turn_id:Q}),sendAudio:ke,sendSpeechEnd:(Ie,Q)=>ne("user_speech_end",{session_id:Ie,turn_id:Q}),sendInterrupt:(Ie,Q)=>ne("interrupt",{session_id:Ie,turn_id:Q}),sendCallEnd:Ie=>ne("call_end",{session_id:Ie}),disconnect:Me,snapshot:()=>Object.freeze({connected:!!(T&&T.readyState===1&&!de),closed:de,awaitingPcm:!!me})}}var cs={},wa={},ac;function Tc(){if(ac)return wa;ac=1,Object.defineProperty(wa,"__esModule",{value:!0}),wa.baseAssetPath=void 0;const M=typeof window<"u"&&typeof window.document<"u"?window.document.currentScript:null;let Y="/";return M&&(Y=M.src.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^/]+$/,"/")),wa.baseAssetPath=Y,wa}var ba={},nc;function ws(){if(nc)return ba;nc=1,Object.defineProperty(ba,"__esModule",{value:!0}),ba.defaultModelFetcher=void 0;const I=M=>fetch(M).then(Y=>Y.arrayBuffer());return ba.defaultModelFetcher=I,ba}var cr={},$a={},sc;function ka(){if(sc)return $a;sc=1,Object.defineProperty($a,"__esModule",{value:!0}),$a.log=void 0;const I=M=>Y=>{console.log(`VAD | ${M} >`,Y)};return $a.log={error:I("error"),debug:I("debug"),warn:I("warn")},$a}var va={},oc;function Za(){if(oc)return va;oc=1,Object.defineProperty(va,"__esModule",{value:!0}),va.Message=void 0;var I;return(function(M){M.AudioFrame="AUDIO_FRAME",M.SpeechStart="SPEECH_START",M.VADMisfire="VAD_MISFIRE",M.SpeechEnd="SPEECH_END",M.SpeechStop="SPEECH_STOP",M.SpeechRealStart="SPEECH_REAL_START",M.FrameProcessed="FRAME_PROCESSED"})(I||(va.Message=I={})),va}var uc;function bs(){if(uc)return cr;uc=1,Object.defineProperty(cr,"__esModule",{value:!0}),cr.FrameProcessor=cr.validateOptions=cr.defaultFrameProcessorOptions=void 0;const I=ka(),M=Za();cr.defaultFrameProcessorOptions={positiveSpeechThreshold:.3,negativeSpeechThreshold:.25,preSpeechPadMs:800,redemptionMs:1400,minSpeechMs:400,submitUserSpeechOnPause:!1};function Y(re){(re.positiveSpeechThreshold<0||re.positiveSpeechThreshold>1)&&I.log.error("positiveSpeechThreshold should be a number between 0 and 1"),(re.negativeSpeechThreshold<0||re.negativeSpeechThreshold>re.positiveSpeechThreshold)&&I.log.error("negativeSpeechThreshold should be between 0 and positiveSpeechThreshold"),re.preSpeechPadMs<0&&I.log.error("preSpeechPadMs should be positive"),re.redemptionMs<0&&I.log.error("redemptionMs should be positive"),re.minSpeechMs<0&&I.log.error("minSpeechMs should be positive")}cr.validateOptions=Y;const te=re=>{const Z=re.reduce((ee,me)=>(ee.push(ee.at(-1)+me.length),ee),[0]),T=new Float32Array(Z.at(-1));return re.forEach((ee,me)=>{const de=Z[me];T.set(ee,de)}),T};function L(re,Z){const T=Math.floor(re.redemptionMs/Z),ee=Math.floor(re.preSpeechPadMs/Z),me=Math.floor(re.minSpeechMs/Z);return{redemptionFrames:T,preSpeechPadFrames:ee,minSpeechFrames:me}}class H{constructor(Z,T,ee,me){this.modelProcessFunc=Z,this.modelResetFunc=T,this.options=ee,this.msPerFrame=me,this.speaking=!1,this.redemptionCounter=0,this.speechFrameCount=0,this.active=!1,this.speechRealStartFired=!1,this.setOptions=le=>{this.options={...this.options,...le};const{redemptionFrames:ne,preSpeechPadFrames:ke,minSpeechFrames:Me}=L(this.options,this.msPerFrame);this.redemptionFrames=ne,this.preSpeechPadFrames=ke,this.minSpeechFrames=Me},this.reset=()=>{this.speaking=!1,this.speechRealStartFired=!1,this.audioBuffer=[],this.modelResetFunc(),this.redemptionCounter=0,this.speechFrameCount=0},this.pause=le=>{this.active=!1,this.options.submitUserSpeechOnPause?this.endSegment(le):this.reset()},this.resume=()=>{this.active=!0},this.endSegment=le=>{const ne=this.audioBuffer;this.audioBuffer=[];const ke=this.speaking;if(this.reset(),ke)if(ne.reduce((Ie,Q)=>Q.isSpeech?Ie+1:Ie,0)>=this.minSpeechFrames){const Ie=te(ne.map(Q=>Q.frame));le({msg:M.Message.SpeechEnd,audio:Ie})}else le({msg:M.Message.VADMisfire});return{}},this.process=async(le,ne)=>{if(!this.active)return;const ke=await this.modelProcessFunc(le),Me=ke.isSpeech>=this.options.positiveSpeechThreshold;if(ne({probs:ke,msg:M.Message.FrameProcessed,frame:le}),this.audioBuffer.push({frame:le,isSpeech:Me}),Me&&(this.speechFrameCount++,this.redemptionCounter=0),Me&&!this.speaking&&(this.speaking=!0,ne({msg:M.Message.SpeechStart})),this.speaking&&this.speechFrameCount===this.minSpeechFrames&&!this.speechRealStartFired&&(this.speechRealStartFired=!0,ne({msg:M.Message.SpeechRealStart})),ke.isSpeech<this.options.negativeSpeechThreshold&&this.speaking&&++this.redemptionCounter>=this.redemptionFrames){this.redemptionCounter=0,this.speechFrameCount=0,this.speaking=!1,this.speechRealStartFired=!1;const Ie=this.audioBuffer;if(this.audioBuffer=[],Ie.reduce((fe,oe)=>oe.isSpeech?fe+1:fe,0)>=this.minSpeechFrames){const fe=te(Ie.map(oe=>oe.frame));ne({msg:M.Message.SpeechEnd,audio:fe})}else ne({msg:M.Message.VADMisfire})}if(!this.speaking){for(;this.audioBuffer.length>this.preSpeechPadFrames;)this.audioBuffer.shift();this.speechFrameCount=0}},this.audioBuffer=[];const{redemptionFrames:de,preSpeechPadFrames:ue,minSpeechFrames:pe}=L(this.options,this.msPerFrame);this.redemptionFrames=de,this.preSpeechPadFrames=ue,this.minSpeechFrames=pe,this.reset()}}return cr.FrameProcessor=H,cr}var fr={};function Ut(I){throw new Error('Could not dynamically require "'+I+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var fs={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */var lc;function Zf(){return lc||(lc=1,(function(I,M){var Y=(()=>{var te=Object.defineProperty,L=Object.getOwnPropertyDescriptor,H=Object.getOwnPropertyNames,re=Object.prototype.hasOwnProperty,Z=(e=>typeof Ut<"u"?Ut:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof Ut<"u"?Ut:t)[r]}):e)(function(e){if(typeof Ut<"u")return Ut.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),T=(e,t)=>()=>(e&&(t=e(e=0)),t),ee=(e,t)=>{for(var r in t)te(e,r,{get:t[r],enumerable:!0})},me=(e,t,r,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of H(t))!re.call(e,a)&&a!==r&&te(e,a,{get:()=>t[a],enumerable:!(i=L(t,a))||i.enumerable});return e},de=e=>me(te({},"__esModule",{value:!0}),e),ue,pe,le,ne,ke,Me=T(()=>{ue=new Map,pe=[],le=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let i=ue.get(e);if(i===void 0)ue.set(e,{backend:t,priority:r});else{if(i.priority>r)return;if(i.priority===r&&i.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=pe.indexOf(e);a!==-1&&pe.splice(a,1);for(let n=0;n<pe.length;n++)if(ue.get(pe[n]).priority<=r){pe.splice(n,0,e);return}pe.push(e)}return}throw new TypeError("not a valid backend")},ne=async e=>{let t=ue.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(i){return r||(t.error=`${i}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},ke=async e=>{let t=e.executionProviders||[],r=t.map(u=>typeof u=="string"?u:u.name),i=r.length===0?pe:r,a,n=[],s=new Set;for(let u of i){let l=await ne(u);typeof l=="string"?n.push({name:u,err:l}):(a||(a=l),a===l&&s.add(u))}if(!a)throw new Error(`no available backend found. ERR: ${n.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:l}of n)r.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${l}`);let o=t.filter(u=>s.has(typeof u=="string"?u:u.name));return[a,new Proxy(e,{get:(u,l)=>l==="executionProviders"?o:Reflect.get(u,l)})]}}),Ie=T(()=>{Me()}),Q,fe=T(()=>{Q="1.22.0"}),oe,N,se=T(()=>{fe(),oe="warning",N={wasm:{},webgl:{},webgpu:{},versions:{common:Q},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);oe=e}},get logLevel(){return oe}},Object.defineProperty(N,"logLevel",{enumerable:!0})}),K,Ue=T(()=>{se(),K=N}),Ae,Le,ot=T(()=>{Ae=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let i=r.getContext("2d");if(i!=null){let a,n;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[3]):(a=e.dims[3],n=e.dims[2]);let s=(t==null?void 0:t.format)!==void 0?t.format:"RGB",o=t==null?void 0:t.norm,u,l;o===void 0||o.mean===void 0?u=[255,255,255,255]:typeof o.mean=="number"?u=[o.mean,o.mean,o.mean,o.mean]:(u=[o.mean[0],o.mean[1],o.mean[2],0],o.mean[3]!==void 0&&(u[3]=o.mean[3])),o===void 0||o.bias===void 0?l=[0,0,0,0]:typeof o.bias=="number"?l=[o.bias,o.bias,o.bias,o.bias]:(l=[o.bias[0],o.bias[1],o.bias[2],0],o.bias[3]!==void 0&&(l[3]=o.bias[3]));let d=n*a,p=0,f=d,h=d*2,m=-1;s==="RGBA"?(p=0,f=d,h=d*2,m=d*3):s==="RGB"?(p=0,f=d,h=d*2):s==="RBG"&&(p=0,h=d,f=d*2);for(let y=0;y<n;y++)for(let $=0;$<a;$++){let w=(e.data[p++]-l[0])*u[0],_=(e.data[f++]-l[1])*u[1],S=(e.data[h++]-l[2])*u[2],x=m===-1?255:(e.data[m++]-l[3])*u[3];i.fillStyle="rgba("+w+","+_+","+S+","+x+")",i.fillRect($,y,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Le=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),i;if(r!=null){let a,n,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[1],s=e.dims[3]):(a=e.dims[3],n=e.dims[2],s=e.dims[1]);let o=t!==void 0&&t.format!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,l,d;u===void 0||u.mean===void 0?l=[255,255,255,255]:typeof u.mean=="number"?l=[u.mean,u.mean,u.mean,u.mean]:(l=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(l[3]=u.mean[3])),u===void 0||u.bias===void 0?d=[0,0,0,0]:typeof u.bias=="number"?d=[u.bias,u.bias,u.bias,u.bias]:(d=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(d[3]=u.bias[3]));let p=n*a;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let f=4,h=0,m=1,y=2,$=3,w=0,_=p,S=p*2,x=-1;o==="RGBA"?(w=0,_=p,S=p*2,x=p*3):o==="RGB"?(w=0,_=p,S=p*2):o==="RBG"&&(w=0,S=p,_=p*2),i=r.createImageData(a,n);for(let z=0;z<n*a;h+=f,m+=f,y+=f,$+=f,z++)i.data[h]=(e.data[w++]-d[0])*l[0],i.data[m]=(e.data[_++]-d[1])*l[1],i.data[y]=(e.data[S++]-d[2])*l[2],i.data[$]=x===-1?255:(e.data[x++]-d[3])*l[3]}else throw new Error("Can not access image data");return i}}),We,Ke,At,Ot,je,ft,nr=T(()=>{Pe(),We=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:i}=t,a=t.norm??{mean:255,bias:0},n,s;typeof a.mean=="number"?n=[a.mean,a.mean,a.mean,a.mean]:n=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?s=[a.bias,a.bias,a.bias,a.bias]:s=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let o=t.format!==void 0?t.format:"RGBA",u=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*i,d=u==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),p=4,f=0,h=1,m=2,y=3,$=0,w=l,_=l*2,S=-1;o==="RGB"&&(p=3,f=0,h=1,m=2,y=-1),u==="RGBA"?S=l*3:u==="RBG"?($=0,_=l,w=l*2):u==="BGR"&&(_=0,w=l,$=l*2);for(let x=0;x<l;x++,f+=p,m+=p,h+=p,y+=p)d[$++]=(e[f]+s[0])/n[0],d[w++]=(e[h]+s[1])/n[1],d[_++]=(e[m]+s[2])/n[2],S!==-1&&y!==-1&&(d[S++]=(e[y]+s[3])/n[3]);return u==="RGBA"?new He("float32",d,[1,4,r,i]):new He("float32",d,[1,3,r,i])},Ke=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,i=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,n=typeof e=="string",s,o=t??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=d=>typeof HTMLCanvasElement<"u"&&d instanceof HTMLCanvasElement||d instanceof OffscreenCanvas?d.getContext("2d"):null;if(r){let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(f=t.resizedHeight,h=t.resizedWidth),t!==void 0){if(o=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");o.tensorFormat="RGBA",o.height=f,o.width=h}else o.tensorFormat="RGBA",o.height=f,o.width=h;p.drawImage(e,0,0),s=p.getImageData(0,0,h,f).data}else throw new Error("Can not access image data")}else if(i){let d,p;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(d=t.resizedHeight,p=t.resizedWidth):(d=e.height,p=e.width),t!==void 0&&(o=t),o.format="RGBA",o.height=d,o.width=p,t!==void 0){let f=u();f.width=p,f.height=d;let h=l(f);if(h!=null)h.putImageData(e,0,0),s=h.getImageData(0,0,p,d).data;else throw new Error("Can not access image data")}else s=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;return p.drawImage(e,0,0,h,f),s=p.getImageData(0,0,h,f).data,o.height=f,o.width=h,We(s,o)}else throw new Error("Can not access image data")}else{if(n)return new Promise((d,p)=>{let f=u(),h=l(f);if(!e||!h)return p();let m=new Image;m.crossOrigin="Anonymous",m.src=e,m.onload=()=>{f.width=m.width,f.height=m.height,h.drawImage(m,0,0,f.width,f.height);let y=h.getImageData(0,0,f.width,f.height);o.height=f.height,o.width=f.width,d(We(y.data,o))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return We(s,o);throw new Error("Input data provided is not supported - aborted tensor creation")},At=(e,t)=>{let{width:r,height:i,download:a,dispose:n}=t,s=[1,i,r,4];return new He({location:"texture",type:"float32",texture:e,dims:s,download:a,dispose:n})},Ot=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new He({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:i,download:a,dispose:n})},je=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new He({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:i,download:a,dispose:n})},ft=(e,t,r)=>new He({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),it,J,Ye,vt,Nt=T(()=>{it=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),J=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Ye=!1,vt=()=>{if(!Ye){Ye=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,i=typeof r<"u"&&r.from;e&&(it.set("int64",BigInt64Array),J.set(BigInt64Array,"int64")),t&&(it.set("uint64",BigUint64Array),J.set(BigUint64Array,"uint64")),i?(it.set("float16",r),J.set(r,"float16")):it.set("float16",Uint16Array)}}}),Tr,Er,li=T(()=>{Pe(),Tr=e=>{let t=1;for(let r=0;r<e.length;r++){let i=e[r];if(typeof i!="number"||!Number.isSafeInteger(i))throw new TypeError(`dims[${r}] must be an integer, got: ${i}`);if(i<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${i}`);t*=i}return t},Er=(e,t)=>{switch(e.location){case"cpu":return new He(e.type,e.data,t);case"cpu-pinned":return new He({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new He({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new He({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new He({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),He,Pe=T(()=>{ot(),nr(),Nt(),li(),He=class{constructor(e,t,r){vt();let i,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,i=e.type,a=e.dims,e.location){case"cpu-pinned":{let s=it.get(i);if(!s)throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);if(!(e.data instanceof s))throw new TypeError(`buffer should be of type ${s.name}`);this.cpuData=e.data;break}case"texture":{if(i!=="float32")throw new TypeError(`unsupported type "${i}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint64"&&i!=="int8"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let s,o;if(typeof e=="string")if(i=e,o=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");s=t}else{let u=it.get(e);if(u===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&u===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${u.name} as data.`);e==="uint64"||e==="int64"?s=u.from(t,BigInt):s=u.from(t)}else if(t instanceof u)s=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")s=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&u!==Uint16Array)s=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${i} tensor's data must be type of ${u}`)}else if(o=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let u=typeof e[0];if(u==="string")i="string",s=e;else if(u==="boolean")i="bool",s=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${u}.`)}else if(e instanceof Uint8ClampedArray)i="uint8",s=Uint8Array.from(e);else{let u=J.get(e.constructor);if(u===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);i=u,s=e}if(o===void 0)o=[s.length];else if(!Array.isArray(o))throw new TypeError("A tensor's dims must be a number array");a=o,this.cpuData=s,this.dataLocation="cpu"}let n=Tr(a);if(this.cpuData&&n!==this.cpuData.length&&!((i==="uint4"||i==="int4")&&Math.ceil(n/2)===this.cpuData.length))throw new Error(`Tensor's size(${n}) does not match data length(${this.cpuData.length}).`);this.type=i,this.dims=a,this.size=n}static async fromImage(e,t){return Ke(e,t)}static fromTexture(e,t){return At(e,t)}static fromGpuBuffer(e,t){return Ot(e,t)}static fromMLTensor(e,t){return je(e,t)}static fromPinnedBuffer(e,t,r){return ft(e,t,r)}toDataURL(e){return Ae(this,e)}toImageData(e){return Le(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Er(this,e)}}}),qe,Rt=T(()=>{Pe(),qe=He}),dt,Ir,pt,ut,Ci=T(()=>{se(),dt=(e,t)=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||console.timeStamp(`${e}::ORT::${t}`)},Ir=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],i=!1;for(let n=0;n<r.length;n++){if(i&&!r[n].includes("TRACE_FUNC")){let s=`FUNC_${e}::${r[n].trim().split(" ")[1]}`;t&&(s+=`::${t}`),dt("CPU",s);return}r[n].includes("TRACE_FUNC")&&(i=!0)}},pt=e=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||Ir("BEGIN",e)},ut=e=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||Ir("END",e)}}),zi,Qa=T(()=>{Me(),Rt(),Ci(),zi=class Ec{constructor(t){this.handler=t}async run(t,r,i){pt();let a={},n={};if(typeof t!="object"||t===null||t instanceof qe||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof qe)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,d=Object.getOwnPropertyNames(r);for(let p of this.outputNames)if(d.indexOf(p)!==-1){let f=r[p];(f===null||f instanceof qe)&&(l=!0,s=!1,a[p]=f)}if(l){if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else n=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(let l of this.outputNames)a[l]=null;let o=await this.handler.run(t,a,n),u={};for(let l in o)if(Object.hasOwnProperty.call(o,l)){let d=o[l];d instanceof qe?u[l]=d:u[l]=new qe(d.type,d.data,d.dims)}return ut(),u}async release(){return this.handler.dispose()}static async create(t,r,i,a){pt();let n,s={};if(typeof t=="string"){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let d=t,p=0,f=t.byteLength;if(typeof r=="object"&&r!==null)s=r;else if(typeof r=="number"){if(p=r,!Number.isSafeInteger(p))throw new RangeError("'byteOffset' must be an integer.");if(p<0||p>=d.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${d.byteLength}).`);if(f=t.byteLength-p,typeof i=="number"){if(f=i,!Number.isSafeInteger(f))throw new RangeError("'byteLength' must be an integer.");if(f<=0||p+f>d.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${d.byteLength-p}].`);if(typeof a=="object"&&a!==null)s=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof i<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");n=new Uint8Array(d,p,f)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[o,u]=await ke(s),l=await o.createInferenceSessionHandler(n,u);return ut(),new Ec(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Xa=T(()=>{Qa(),kr=zi}),Ya=T(()=>{}),Ja=T(()=>{}),en=T(()=>{}),tn=T(()=>{}),Ai={};ee(Ai,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>qe,env:()=>K,registerBackend:()=>le});var ht=T(()=>{Ie(),Ue(),Xa(),Rt(),Ya(),Ja(),Ci(),en(),tn()}),Cr=T(()=>{}),Oi={};ee(Oi,{default:()=>Ri});var zr,Ar,Ri,rn=T(()=>{var e;Up(),Tt(),Dr(),zr="ort-wasm-proxy-worker",Ar=((e=globalThis.self)==null?void 0:e.name)===zr,Ar&&(self.onmessage=t=>{let{type:r,in:i}=t.data;try{switch(r){case"init-wasm":Nr(i.wasm).then(()=>{Yn(i).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:n}=i;Jn(n,a).then(()=>{postMessage({type:r})},s=>{postMessage({type:r,err:s})});break}case"copy-from":{let{buffer:a}=i,n=Wa(a);postMessage({type:r,out:n});break}case"create":{let{model:a,options:n}=i;ts(a,n).then(s=>{postMessage({type:r,out:s})},s=>{postMessage({type:r,err:s})});break}case"release":rs(i),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:n,inputs:s,outputIndices:o,options:u}=i;as(a,n,s,o,new Array(o.length).fill(null),u).then(l=>{l.some(d=>d[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:l},ss([...s,...l]))},l=>{postMessage({type:r,err:l})});break}case"end-profiling":ns(i),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),Ri=Ar?null:t=>new Worker(t??Qe,{type:"classic",name:zr})}),Mi,Bi,Qe,Or,sr,Di,Pi,Rr,Ui,Mr,Ni,Br,Li,Dr=T(()=>{Cr(),Mi=typeof location>"u"?void 0:location.origin,Bi=()=>{var e,t;return typeof document<"u"?(e=document.currentScript)==null?void 0:e.src:typeof self<"u"?(t=self.location)==null?void 0:t.href:void 0},Qe=Bi(),Or=()=>{if(Qe&&!Qe.startsWith("blob:"))return Qe.substring(0,Qe.lastIndexOf("/")+1)},sr=(e,t)=>{try{let r=t??Qe;return(r?new URL(e,r):new URL(e)).origin===Mi}catch{return!1}},Di=(e,t)=>{let r=t??Qe;try{return(r?new URL(e,r):new URL(e)).href}catch{return}},Pi=(e,t)=>`${t??"./"}${e}`,Rr=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Ui=async e=>(await import(e)).default,Mr=(rn(),de(Oi)).default,Ni=async()=>{if(!Qe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(sr(Qe))return[void 0,Mr()];let e=await Rr(Qe);return[e,Mr(e)]},Br=void 0,Li=async(e,t,r)=>{if(!e&&!t&&Br&&Qe&&sr(Qe))return[void 0,Br];{let i="ort-wasm-simd-threaded.jsep.mjs",a=e??Di(i,t),n=r&&a&&!sr(a,t),s=n?await Rr(a):a??Pi(i,t);return[n?s:void 0,await Ui(s)]}}}),Pr,or,Lt,Ur,qi,Vi,Fi,Nr,Te,Tt=T(()=>{Dr(),or=!1,Lt=!1,Ur=!1,qi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Vi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Fi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async e=>{if(or)return Promise.resolve();if(Lt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");Lt=!0;let t=e.initTimeout,r=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Fi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Vi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let i=qi();r>1&&!i&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,n=typeof a=="string"?a:void 0,s=a==null?void 0:a.mjs,o=(s==null?void 0:s.href)??s,u=a==null?void 0:a.wasm,l=(u==null?void 0:u.href)??u,d=e.wasmBinary,[p,f]=await Li(o,n,r>1),h=!1,m=[];if(t>0&&m.push(new Promise(y=>{setTimeout(()=>{h=!0,y()},t)})),m.push(new Promise((y,$)=>{let w={numThreads:r};if(d)w.wasmBinary=d;else if(l||n)w.locateFile=_=>l??n+_;else if(o&&o.indexOf("blob:")!==0)w.locateFile=_=>new URL(_,o).href;else if(p){let _=Or();_&&(w.locateFile=S=>_+S)}f(w).then(_=>{Lt=!1,or=!0,Pr=_,y(),p&&URL.revokeObjectURL(p)},_=>{Lt=!1,Ur=!0,$(_)})})),await Promise.race(m),h)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},Te=()=>{if(or&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),tt,ur,ve,Lr=T(()=>{Tt(),tt=(e,t)=>{let r=Te(),i=r.lengthBytesUTF8(e)+1,a=r._malloc(i);return r.stringToUTF8(e,a,i),t.push(a),a},ur=(e,t,r,i)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,n])=>{let s=t?t+a:a;if(typeof n=="object")ur(n,s+".",r,i);else if(typeof n=="string"||typeof n=="number")i(s,n.toString());else if(typeof n=="boolean")i(s,n?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof n}`)})},ve=e=>{let t=Te(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetLastError(a,a+i);let n=Number(t.getValue(a,i===4?"i32":"i64")),s=t.getValue(a+i,"*"),o=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${n}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(r)}}}),Wi,an=T(()=>{Tt(),Lr(),Wi=e=>{let t=Te(),r=0,i=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let n=0;return(e==null?void 0:e.tag)!==void 0&&(n=tt(e.tag,i)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,n),r===0&&ve("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&ur(e.extra,"",new WeakSet,(s,o)=>{let u=tt(s,i),l=tt(o,i);t._OrtAddRunConfigEntry(r,u,l)!==0&&ve(`Can't set a run config entry: ${s} - ${o}.`)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseRunOptions(r),i.forEach(s=>t._free(s)),n}}}),Gi,ji,Hi,qt,Ki,Zi,nn=T(()=>{Tt(),Lr(),Gi=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},ji=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Hi=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},qt=(e,t,r,i)=>{let a=tt(t,i),n=tt(r,i);Te()._OrtAddSessionConfigEntry(e,a,n)!==0&&ve(`Can't set a session config entry: ${t} - ${r}.`)},Ki=async(e,t,r)=>{for(let i of t){let a=typeof i=="string"?i:i.name,n=[];switch(a){case"webnn":if(a="WEBNN",typeof i!="string"){let d=i==null?void 0:i.deviceType;d&&qt(e,"deviceType",d,r)}break;case"webgpu":if(a="JS",typeof i!="string"){let d=i;if(d!=null&&d.preferredLayout){if(d.preferredLayout!=="NCHW"&&d.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${d.preferredLayout}`);qt(e,"preferredLayout",d.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${a}`)}let s=tt(a,r),o=n.length,u=0,l=0;if(o>0){u=Te()._malloc(o*Te().PTR_SIZE),r.push(u),l=Te()._malloc(o*Te().PTR_SIZE),r.push(l);for(let d=0;d<o;d++)Te().setValue(u+d*Te().PTR_SIZE,n[d][0],"*"),Te().setValue(l+d*Te().PTR_SIZE,n[d][1],"*")}await Te()._OrtAppendExecutionProvider(e,s,u,l,o)!==0&&ve(`Can't append execution provider: ${a}.`)}},Zi=async e=>{let t=Te(),r=0,i=[],a=e||{};Hi(a);try{let n=Gi(a.graphOptimizationLevel??"all"),s=ji(a.executionMode??"sequential"),o=typeof a.logId=="string"?tt(a.logId,i):0,u=a.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log serverity level is not valid: ${u}`);let l=a.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let d=typeof a.optimizedModelFilePath=="string"?tt(a.optimizedModelFilePath,i):0;if(r=t._OrtCreateSessionOptions(n,!!a.enableCpuMemArena,!!a.enableMemPattern,s,!!a.enableProfiling,0,o,u,l,d),r===0&&ve("Can't create session options."),a.executionProviders&&await Ki(r,a.executionProviders,i),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);qt(r,"enableGraphCapture",a.enableGraphCapture.toString(),i)}if(a.freeDimensionOverrides)for(let[p,f]of Object.entries(a.freeDimensionOverrides)){if(typeof p!="string")throw new Error(`free dimension override name must be a string: ${p}`);if(typeof f!="number"||!Number.isInteger(f)||f<0)throw new Error(`free dimension override value must be a non-negative integer: ${f}`);let h=tt(p,i);t._OrtAddFreeDimensionOverride(r,h,f)!==0&&ve(`Can't set a free dimension override: ${p} - ${f}.`)}return a.extra!==void 0&&ur(a.extra,"",new WeakSet,(p,f)=>{qt(r,p,f,i)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseSessionOptions(r)!==0&&ve("Can't release session options."),i.forEach(s=>t._free(s)),n}}}),Et,It,kt,qr,Vr,Fr,Wr,di,Se=T(()=>{Et=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},It=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},kt=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],i=typeof t=="number"?t:t.reduce((a,n)=>a*n,1);return r>0?Math.ceil(i*r):void 0},qr=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Vr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Fr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Wr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",di=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Gr,Qi=T(()=>{Cr(),Gr=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),i=r?parseInt(r,10):0;if(i<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),n;try{n=new ArrayBuffer(i)}catch(o){if(o instanceof RangeError){let u=Math.ceil(i/65536);n=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw o}let s=0;for(;;){let{done:o,value:u}=await a.read();if(o)break;let l=u.byteLength;new Uint8Array(n,s,l).set(u),s+=l}return new Uint8Array(n,0,i)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Xi,pi,ci,Jt,fi,hi,De,Mt=T(()=>{Se(),Xi=["V","I","W","E","F"],pi=(e,t)=>{console.log(`[${Xi[e]},${new Date().toISOString()}]${t}`)},fi=(e,t)=>{ci=e,Jt=t},hi=(e,t)=>{let r=Vr(e),i=Vr(ci);r>=i&&pi(r,typeof t=="function"?t():t)},De=(...e)=>{Jt&&hi(...e)}}),mi,er,D,mr,gi,Yi,Vt,_e=T(()=>{mi=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},er=class{static calcShape(e,t,r=!1){let i=e.length,a=t.length;if(i===0)return t;if(a===0)return e;let n=Math.max(e.length,t.length),s=new Array(n);if(r){if(i<2||a<2)return;let o=mi.calcMatMulShape([e[i-2],e[i-1]],[t[a-2],t[a-1]]);if(o===void 0)return;[s[n-2],s[n-1]]=o}for(let o=r?3:1;o<=n;o++){let u=i-o<0?1:e[i-o],l=a-o<0?1:t[a-o];if(u!==l&&u>1&&l>1)return;let d=Math.max(u,l);if(u&&l)s[n-o]=Math.max(u,l);else{if(d>1)return;s[n-o]=0}}return s}static isValidBroadcast(e,t){let r=e.length,i=t.length;if(r>i)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[i-a])return!1;return!0}},D=class Ha{static size(t){return Ha.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let i=t.length;if(i===0)return[];let a=new Array(i),n=i-1;for(;n>=0;){if(t[n]%r===0){a[n]=t[n]/r;break}if(r%t[n]!==0)throw new Error("cannot convert shape");a[n]=1,r/=t[n],n--}for(n--;n>=0;n--)a[n]=t[n];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Ha.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Ha.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,i){let a=1;for(let n=r;n<i;n++){if(t[n]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=Number(t[n])}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let i=new Array(r);i[r-1]=1,i[r-2]=t[r-1];for(let a=r-3;a>=0;--a)i[a]=i[a+1]*t[a+1];return i}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(i=>this.normalizeAxis(i,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(i=>t[i]):t.slice().reverse()}static padShape(t,r){let i=t.length;return t.map((a,n)=>a+r[n]+r[n+i])}static areEqual(t,r){return t.length!==r.length?!1:t.every((i,a)=>i===r[a])}},mr=class Ia{static adjustPoolAttributes(t,r,i,a,n,s){if(!t&&i.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let o=0;o<r.length-2;o++)o>=i.length?i.push(r[o+2]):i[o]=r[o+2];for(let o=0;o<i.length;o++)if(o<a.length){if(a[o]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let o=0;o<i.length;o++)if(o<n.length){if(n[o]<0)throw new Error("dilations should be greater than or equal to 1")}else n.push(1);for(let o=0;o<i.length*2;o++)if(o<s.length){if(s[o]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let o=0;o<i.length;o++){if(i[o]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[o]>=i[o]||s[o+i.length]>=i[o])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,i,a,n,s,o){if(o){if(n.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<t.length-2;u++)Ia.adjustPadAndReturnShape(t[u+(s?1:2)],r[u],i[u],a[u],n,u,u+t.length-2,o)}}static computePoolOutputShape(t,r,i,a,n,s,o){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let u=[r[0],r[1]];return Ia.computeShapeHelper(t,r,u,i,a,n,s,o),u}static computeConvOutputShape(t,r,i,a,n,s,o){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[t[0],r[0]];return Ia.computeShapeHelper(!1,t,u,i,a,n,s,o),u}static computeShapeHelper(t,r,i,a,n,s,o,u){if(t)for(let l=0;l<r.length-2;l++)i.push(1);else for(let l=0;l<r.length-2;l++)i.push(Ia.adjustPadAndReturnShape(r[l+2],a[l],n[l],s[l],o,l,l+r.length-2,u))}static adjustPadAndReturnShape(t,r,i,a,n,s,o,u){let l=i*(a-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return n[s]=0,n[o]=0,Math.floor((t-l)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(i!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let d=((t+r-1)/r-1)*r+a-t;return n[s]=Math.floor(u==="SAME_LOWER"?(d+1)/2:d/2),n[o]=d-n[s],Math.floor((t+d-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+n[s]+n[o]-l)/r+1)}},gi=class{static getShapeOfGemmResult(e,t,r,i,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let n,s,o;t?(n=e[1],s=e[0]):(n=e[0],s=e[1]);let u=-1;if(i?(o=r[0],u=1):(o=r[1],u=0),r[u]!==s)throw new Error("dimension mismatch");if(n<=0||o<=0||s<=0)throw new Error("invalid shape specified");if(a&&!er.isValidBroadcast(a,[n,o]))throw new Error("gemm: invalid bias shape for broadcast");return[n,o,s]}},Yi=-34028234663852886e22,Vt=34028234663852886e22}),tr,gr=T(()=>{Se(),tr=(e,t)=>new(qr(t))(e)}),lr,yr,jr,Hr,Ft,rr,yi,_i,wi,Ji,ea,Ca=T(()=>{Se(),Mt(),lr=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),yr=(e,t)=>{if(t==="int32")return e;let r=lr.get(t);if(!r)throw new Error(`WebNN backend does not support data type: ${t}`);let i=r/8;if(e.byteLength%i!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${i}.`);let a=e.byteLength/i,n=new(qr(t))(e.buffer,e.byteOffset,a);switch(t){case"int64":case"uint64":{let s=new Int32Array(a);for(let o=0;o<a;o++){let u=n[o];if(u>2147483647n||u<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");s[o]=Number(u)}return new Uint8Array(s.buffer)}case"int8":case"uint8":case"uint32":{if(t==="uint32"&&n.some(o=>o>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let s=Int32Array.from(n,Number);return new Uint8Array(s.buffer)}default:throw new Error(`Unsupported data conversion from ${t} to 'int32'`)}},jr=(e,t)=>{if(t==="int32")return e;if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let r=e.byteLength/4,i=new Int32Array(e.buffer,e.byteOffset,r);switch(t){case"int64":{let a=BigInt64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"uint64":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let a=BigUint64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"int8":{if(i.some(n=>n<-128||n>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let a=Int8Array.from(i,Number);return new Uint8Array(a.buffer)}case"uint8":{if(i.some(a=>a<0||a>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(i,Number)}case"uint32":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let a=Uint32Array.from(i,Number);return new Uint8Array(a.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${t}`)}},Hr=1,Ft=()=>Hr++,rr=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),yi=(e,t)=>{let r=lr.get(e);if(!r)throw new Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((i,a)=>i*a)*r/8):0},_i=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:r,tensor:i,dataType:a,shape:n,fallbackDataType:s}=e;this.sessionId=t,this.mlContext=r,this.mlTensor=i,this.dataType=a,this.tensorShape=n,this.fallbackDataType=s}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return yi(this.dataType,this.tensorShape)}destroy(){De("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),r=jr(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(r);return}else return r.buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,r){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===r.length&&this.tensorShape.every((i,a)=>i===r[a])}setIsDataConverted(e){this.isDataConverted=e}},wi=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,r,i){let a=this.tensorManager.getMLContext(e),n;if(!a.opSupportLimits().input.dataTypes.includes(t)){if(n=rr.get(t),!n||!a.opSupportLimits().input.dataTypes.includes(n))throw new Error(`WebNN backend does not support data type: ${t}`);De("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${n}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(a,t,r))return this.wrapper.tensor;if(i){if(this.wrapper.byteLength!==yi(t,r))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let s=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,r,s,!0,!0,n),i&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")t=yr(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else De("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,r;if(this.activeUpload){let i=(t=this.wrapper)!=null&&t.isDataConverted?jr(this.activeUpload,(r=this.wrapper)==null?void 0:r.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(i):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(i);return}else return i.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},Ji=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=Ft();return this.tensorTrackersById.set(e,new wi(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,r,i,a){De("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${r}, shape: ${i}, copyOld: ${a}}`);let n=this.tensorTrackersById.get(t);if(!n)throw new Error("Tensor not found.");return n.ensureTensor(e,r,i,a)}upload(e,t){let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");r.upload(t)}async download(e,t){De("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");return r.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,r,i){let a=this.getMLContext(e),n=Ft(),s=new _i({sessionId:e,context:a,tensor:t,dataType:r,shape:i});return this.tensorTrackersById.set(n,new wi(this,s)),this.externalTensors.add(s),n}async getCachedTensor(e,t,r,i,a,n,s){let o=this.getMLContext(e);for(let[l,d]of this.freeTensors.entries())if(d.canReuseTensor(o,t,r)){De("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}`);let p=this.freeTensors.splice(l,1)[0];return p.sessionId=e,p}De("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}}`);let u=await o.createTensor({dataType:s??t,shape:r,dimensions:r,usage:i,writable:a,readable:n});return new _i({sessionId:e,context:o,tensor:u,dataType:t,shape:r,fallbackDataType:s})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},ea=(...e)=>new Ji(...e)}),_r,ta,ra,ia=T(()=>{Se(),Tt(),gr(),Ca(),Mt(),_r=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),ta=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let r=Object.keys(e).sort(),i=Object.keys(t).sort();return r.length===i.length&&r.every((a,n)=>a===i[n]&&e[a]===t[a])},ra=class{constructor(e){this.tensorManager=ea(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,fi(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){De("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){De("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let r of t)De("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${r}}`),this.tensorManager.releaseTensorId(r);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let r=this.mlContextCache.findIndex(i=>i.gpuDevice===e);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:i}),i}}else if(e===void 0){let r=this.mlContextCache.findIndex(i=>i.options===void 0&&i.gpuDevice===void 0);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:i}),i}}let t=this.mlContextCache.findIndex(r=>ta(r.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:r}),r}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);if(r.delete(e),r.size===0){this.sessionIdsByMLContext.delete(t);let i=this.mlContextCache.findIndex(a=>a.mlContext===t);i!==-1&&this.mlContextCache.splice(i,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){De("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,i,a){let n=_r.get(r);if(!n)throw new Error(`Unsupported ONNX data type: ${r}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,n,i,a)}async createTemporaryTensor(e,t,r){De("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${r}}`);let i=_r.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,a,i,r,!1);let n=this.temporarySessionTensorIds.get(e);return n?n.push(a):this.temporarySessionTensorIds.set(e,[a]),a}uploadTensor(e,t){if(!Te().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");De("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return tr(r,t)}}registerMLTensor(e,t,r,i){let a=_r.get(r);if(!a)throw new Error(`Unsupported ONNX data type: ${r}`);let n=this.tensorManager.registerTensor(e,t,a,i);return De("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${a}, dimensions: ${i}} -> {tensorId: ${n}}`),n}registerMLConstant(e,t,r,i,a,n,s=!1){if(!n)throw new Error("External mounted files are not available.");let o=e;e.startsWith("./")&&(o=e.substring(2));let u=n.get(o);if(!u)throw new Error(`File with name ${o} not found in preloaded files.`);if(t+r>u.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let l=u.slice(t,t+r).buffer,d;switch(a.dataType){case"float32":d=new Float32Array(l);break;case"float16":d=typeof Float16Array<"u"&&Float16Array.from?new Float16Array(l):new Uint16Array(l);break;case"int32":d=new Int32Array(l);break;case"uint32":d=new Uint32Array(l);break;case"int64":if(s){let p=yr(new Uint8Array(l),"int64");d=new Int32Array(p.buffer),a.dataType="int32"}else d=new BigInt64Array(l);break;case"uint64":d=new BigUint64Array(l);break;case"int8":d=new Int8Array(l);break;case"int4":case"uint4":case"uint8":d=new Uint8Array(l);break;default:throw new Error(`Unsupported data type: ${a.dataType} in creating WebNN Constant from external data.`)}return De("verbose",()=>`[WebNN] registerMLConstant {dataType: ${a.dataType}, shape: ${a.shape}}} ${s?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),i.constant(a,d)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let r=this.sessionGraphInputs.get(e);return r?r.includes(t):!1}isGraphOutput(e,t){let r=this.sessionGraphOutputs.get(e);return r?r.includes(t):!1}isGraphInputOutputTypeSupported(e,t,r=!0){let i=this.mlContextBySessionId.get(e),a=_r.get(Et(t));return typeof a>"u"?!1:r?!!(i!=null&&i.opSupportLimits().input.dataTypes.includes(a)):!!(i!=null&&i.opSupportLimits().output.dataTypes.includes(a))}flush(){}}}),bi=T(()=>{}),$i,vi,Kr,xi,Si,Ti,aa,na,za,sn=T(()=>{Mt(),bi(),$i=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),vi=[],Kr=e=>Math.ceil(Number(e)/16)*16,xi=e=>{for(let t=0;t<vi.length;t++){let r=vi[t];if(e<=r)return r}return Math.ceil(e/16)*16},Si=1,Ti=()=>Si++,aa=async(e,t,r,i)=>{let a=Kr(r),n=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,n,0,a),e.flush(),await n.mapAsync(GPUMapMode.READ);let o=n.getMappedRange();if(i){let u=i();return u.set(new Uint8Array(o,0,r)),u}else return new Uint8Array(o.slice(0,r))}finally{n.destroy()}},na=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of $i)vi.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let r=t.buffer,i=t.byteOffset,a=t.byteLength,n=Kr(a),s=this.storageCache.get(e);if(!s)throw new Error("gpu data for uploading does not exist");if(Number(s.originalSize)!==a)throw new Error(`inconsistent data size. gpu data size=${s.originalSize}, data size=${a}`);let o=this.backend.device.createBuffer({mappedAtCreation:!0,size:n,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),u=o.getMappedRange();new Uint8Array(u).set(new Uint8Array(r,i,a)),o.unmap();let l=this.backend.device.createCommandEncoder();l.copyBufferToBuffer(o,0,s.gpuData.buffer,0,n),this.backend.device.queue.submit([l.finish()]),o.destroy(),De("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let i=this.storageCache.get(t);if(!i)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==i.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=Kr(r.originalSize),n=this.backend.getCommandEncoder();this.backend.endComputePass(),n.copyBufferToBuffer(r.gpuData.buffer,0,i.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let i;if(r){if(i=r[0],e===r[1])return De("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, buffer is the same, skip.`),i;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else i=Ti();return this.storageCache.set(i,{gpuData:{id:i,type:0,buffer:e},originalSize:t}),De("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, registered.`),i}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),De("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=xi(e),i,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,n=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||n){let o=(a?this.freeBuffers:this.freeUniformBuffers).get(r);o?o.length>0?i=o.pop():i=this.backend.device.createBuffer({size:r,usage:t}):i=this.backend.device.createBuffer({size:r,usage:t})}else i=this.backend.device.createBuffer({size:r,usage:t});let s={id:Ti(),type:0,buffer:i};return this.storageCache.set(s.id,{gpuData:s,originalSize:Number(e)}),De("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${s.id}`),s}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,r=this.storageCache.get(t);if(!r){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return De("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${r.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(r.gpuData.buffer),r.originalSize}async download(e,t){let r=this.storageCache.get(Number(e));if(!r)throw new Error("data does not exist");await aa(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=$i.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(De("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(r=>{r.gpuData.buffer.destroy()}),this.storageCache=new Map)}},za=(...e)=>new na(...e)}),c,g,b=T(()=>{c=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},g=e=>new c(e)}),E,v,O,C,k,R,V,W,j,B,ce,A,X,Je,ze,Ce,Ze,ge=T(()=>{Se(),_e(),E=64,v=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},O=(e,t=1)=>{let r=v(e,t);return typeof r=="string"?r:r[0]},C=(e,t=1)=>{let r=v(e,t);return typeof r=="string"?r:r[1]},k=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:D.computeStrides(r)})}),t},R=e=>e%4===0?4:e%2===0?2:1,V=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,W=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,j=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,B=(e,t,r,i)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?i==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:i==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,ce=(e,t,r,i,a)=>{let n=typeof r=="number",s=n?r:r.length,o=[...new Array(s).keys()],u=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,l=v(t,a),d=typeof l=="string"?l:l[1],p=typeof l=="string"?l:l[0],f={indices:u,value:d,storage:p,tensor:t},h=F=>typeof F=="string"?F:`${F}u`,m={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},y=n?"uniforms.":"",$=`${y}${e}_shape`,w=`${y}${e}_strides`,_="";for(let F=0;F<s-1;F++)_+=`
    let dim${F} = current / ${B(w,F,s)};
    let rest${F} = current % ${B(w,F,s)};
    indices[${F}] = dim${F};
    current = rest${F};
    `;_+=`indices[${s-1}] = current;`;let S=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${f.indices} {
    var indices: ${f.indices};
    var current = offset;
    ${_}
    return indices;
  }`,x=F=>(m.offsetToIndices=!0,s<2?F:`o2i_${e}(${F})`),z=[];if(s>=2)for(let F=s-1;F>=0;F--)z.push(`${B(w,F,s)} * (indices[${F}])`);let P=s<2?"":`
  fn i2o_${e}(indices: ${f.indices}) -> u32 {
    return ${z.join("+")};
  }`,U=F=>(m.indicesToOffset=!0,s<2?F:`i2o_${e}(${F})`),q=(...F)=>s===0?"0u":`${f.indices}(${F.map(h).join(",")})`,G=(F,ae)=>s<2?`${F}`:`${B(F,ae,s)}`,ie=(F,ae,be)=>s<2?`${F}=${be};`:`${B(F,ae,s)}=${be};`,xe={},he=(F,ae)=>{m.broadcastedIndicesToOffset=!0;let be=`${ae.name}broadcastedIndicesTo${e}Offset`;if(be in xe)return`${be}(${F})`;let Be=[];for(let Dt=s-1;Dt>=0;Dt--){let ki=ae.indicesGet("outputIndices",Dt+ae.rank-s);Be.push(`${G(w,Dt)} * (${ki} % ${G($,Dt)})`)}return xe[be]=`fn ${be}(outputIndices: ${ae.type.indices}) -> u32 {
             return ${Be.length>0?Be.join("+"):"0u"};
           }`,`${be}(${F})`},$e=(F,ae)=>(()=>{if(f.storage===f.value)return`${e}[${F}]=${ae};`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`${e}[${F}]=vec2<u32>(u32(${ae}), select(0u, 0xFFFFFFFFu, ${ae} < 0));`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`${e}[${F}]=vec2<u32>(u32(${ae}), 0u);`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`${e}[${F}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${ae}));`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),Fe=F=>(()=>{if(f.storage===f.value)return`${e}[${F}]`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`i32(${e}[${F}].x)`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`u32(${e}[${F}].x)`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${F}] & 0xFFu), bool(${e}[${F}] & 0xFF00u), bool(${e}[${F}] & 0xFF0000u), bool(${e}[${F}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),Oe=s<2?"":`
  fn get_${e}ByIndices(indices: ${f.indices}) -> ${d} {
    return ${Fe(`i2o_${e}(indices)`)};
  }`,we=s<2?"":(()=>{let F=o.map(be=>`d${be}: u32`).join(", "),ae=o.map(be=>`d${be}`).join(", ");return`
  fn get_${e}(${F}) -> ${d} {
    return get_${e}ByIndices(${q(ae)});
  }`})(),Re=(...F)=>{if(F.length!==s)throw new Error(`indices length must be ${s}`);let ae=F.map(h).join(",");return s===0?Fe("0u"):s===1?Fe(ae[0]):(m.get=!0,m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}(${ae})`)},ye=F=>s<2?Fe(F):(m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}ByIndices(${F})`),Ee=s<2?"":`
  fn set_${e}ByIndices(indices: ${f.indices}, value: ${d}) {
    ${$e(`i2o_${e}(indices)`,"value")}
  }`,wt=s<2?"":(()=>{let F=o.map(be=>`d${be}: u32`).join(", "),ae=o.map(be=>`d${be}`).join(", ");return`
  fn set_${e}(${F}, value: ${d}) {
    set_${e}ByIndices(${q(ae)}, value);
  }`})();return{impl:()=>{let F=[],ae=!1;return m.offsetToIndices&&(F.push(S),ae=!0),m.indicesToOffset&&(F.push(P),ae=!0),m.broadcastedIndicesToOffset&&(Object.values(xe).forEach(be=>F.push(be)),ae=!0),m.set&&(F.push(wt),ae=!0),m.setByIndices&&(F.push(Ee),ae=!0),m.get&&(F.push(we),ae=!0),m.getByIndices&&(F.push(Oe),ae=!0),!n&&ae&&F.unshift(`const ${$} = ${f.indices}(${r.join(",")});`,`const ${w} = ${f.indices}(${D.computeStrides(r).join(",")});`),F.join(`
`)},type:f,offsetToIndices:x,indicesToOffset:U,broadcastedIndicesToOffset:he,indices:q,indicesGet:G,indicesSet:ie,set:(...F)=>{if(F.length!==s+1)throw new Error(`indices length must be ${s}`);let ae=F[s];if(typeof ae!="string")throw new Error("value must be string");let be=F.slice(0,s).map(h).join(",");return s===0?$e("0u",ae):s===1?$e(be[0],ae):(m.set=!0,m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}(${be}, ${ae})`)},setByOffset:$e,setByIndices:(F,ae)=>s<2?$e(F,ae):(m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}ByIndices(${F}, ${ae});`),get:Re,getByOffset:Fe,getByIndices:ye,usage:i,name:e,strides:w,shape:$,rank:s}},A=(e,t,r,i=1)=>ce(e,t,r,"input",i),X=(e,t,r,i=1)=>ce(e,t,r,"output",i),Je=(e,t,r)=>ce(e,t,r,"atomicOutput",1),ze=(e,t,r,i=1)=>ce(e,t,r,"internal",i),Ce=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=E){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],i=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||i>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*i>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,n=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
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
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Ze=(e,t)=>new Ce(e,t)}),Xe,Ve,ct,mt,xt,Zr,bt,sa,Bt,gt=T(()=>{Se(),_e(),b(),ge(),Xe=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Ve=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),ct=(e,t)=>D.sortBasedOnPerm(e,Ve(e.length,t)),mt=(e,t,r,i)=>{let a=`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let n=0;n<t;++n)a+=`a[${e[n]}]=i[${n}];`;return a+="return a;}"},xt=(e,t)=>{let r=[],i=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&i.push(t[a]);return{newShape:r,newPerm:i}},Zr=(e,t)=>{let r=0;for(let i=0;i<e.length;++i)if(t[e[i]]!==1){if(e[i]<r)return!1;r=e[i]}return!0},bt=(e,t)=>{let r=e.dataType,i=e.dims.length,a=Ve(i,t),n=ct(e.dims,a),s=e.dims,o=n,u=i<2||Zr(a,e.dims),l;if(u)return l=m=>{let y=A("input",r,s,4),$=X("output",r,o,4);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let m=D.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(m/4)}]}},getShaderSource:l};let{newShape:d,newPerm:p}=xt(e.dims,a),f=D.areEqual(p,[2,3,1]),h=D.areEqual(p,[3,1,2]);if(d.length===2||f||h){s=f?[d[0],d[1]*d[2]]:h?[d[0]*d[1],d[2]]:d,o=[s[1],s[0]];let m=16;return l=y=>{let $=A("a",r,s.length),w=X("output",r,o.length);return`
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
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let y=D.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(o[1]/m),y:Math.ceil(o[0]/m)},programUniforms:[{type:12,data:y},...k(s,o)]}},getShaderSource:l}}return l=m=>{let y=A("a",r,s.length),$=X("output",r,o.length);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}

  ${mt(a,i,y,$)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${$.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${$.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let m=D.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...k(s,o)]}},getShaderSource:l}},sa=(e,t)=>{Xe(e.inputs,t.perm),e.compute(bt(e.inputs[0],t.perm))},Bt=e=>g({perm:e.perm})}),oa,Ne,Wt,Aa,Gt,Qr,at,$t,Ei,Xr,Ct,Oa,jt,Ht,wr,nt,et,Pt,Ra,Ma,$s,Oc=T(()=>{Se(),_e(),ge(),un(),gt(),oa={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},Ne={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},Wt={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},Aa={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},Gt=(e,t)=>{let r=[];for(let i=t-e;i<t;++i)r.push(i);return r},Qr=(e,t)=>{let r=[],i=e.length;for(let n=0;n<i;n++)t.indexOf(n)===-1&&r.push(e[n]);let a=t.map(n=>e[n]);return[r,a]},at=(e,t)=>{let r=e.length+t.length,i=[],a=0;for(let n=0;n<r;n++)t.indexOf(n)===-1?i.push(e[a++]):i.push(1);return i},$t=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},Ei=(e,t)=>{let r=[];if(!$t(e,t)){for(let i=0;i<t;++i)e.indexOf(i)===-1&&r.push(i);e.forEach(i=>r.push(i))}return r},Xr=(e,t,r,i,a,n,s)=>{let o=r[0].dims,u=D.size(n),l=D.size(s),d=A("_A",r[0].dataType,o),p=X("output",a,n),f=64;u===1&&(f=256);let h=`
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

          var bestValue = f32(${Wt[i]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${f}) {
           let candidate = f32(${d.getByOffset("offset + k")});
           bestValue = ${oa[i]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${f}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Ne[i]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${p.setByOffset("outputIndex",`${i==="mean"?`${p.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${p.type.storage}(${Aa[i]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${f}`,inputDependencies:["type"]},getShaderSource:m,getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:u},programUniforms:[{type:12,data:l}]})}},Ct=(e,t,r,i)=>{let a=e.inputs.length===1?r:on(e.inputs,r),n=a.axes;n.length===0&&!a.noopWithEmptyAxes&&(n=e.inputs[0].dims.map((h,m)=>m));let s=D.normalizeAxes(n,e.inputs[0].dims.length),o=s,u=e.inputs[0],l=Ei(o,e.inputs[0].dims.length);l.length>0&&(u=e.compute(bt(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],o=Gt(o.length,u.dims.length));let[d,p]=Qr(u.dims,o),f=d;a.keepDims&&(f=at(d,s)),e.compute(Xr(t,a.cacheKey,[u],i,e.inputs[0].dataType,f,p),{inputs:[u]})},Oa=(e,t)=>{Ct(e,"ReduceMeanShared",t,"mean")},jt=(e,t)=>{Ct(e,"ReduceL1Shared",t,"l1")},Ht=(e,t)=>{Ct(e,"ReduceL2Shared",t,"l2")},wr=(e,t)=>{Ct(e,"ReduceLogSumExpShared",t,"logSumExp")},nt=(e,t)=>{Ct(e,"ReduceMaxShared",t,"max")},et=(e,t)=>{Ct(e,"ReduceMinShared",t,"min")},Pt=(e,t)=>{Ct(e,"ReduceProdShared",t,"prod")},Ra=(e,t)=>{Ct(e,"ReduceSumShared",t,"sum")},Ma=(e,t)=>{Ct(e,"ReduceSumSquareShared",t,"sumSquare")},$s=(e,t)=>{Ct(e,"ReduceLogSumShared",t,"logSum")}}),Kt,vs,Ba,on,Zt,xs,Ss,Ts,Es,Is,ks,Cs,zs,As,Os,Qt,Rs,Ms,Bs,Ds,Ps,Us,Ns,Ls,qs,Vs,un=T(()=>{Se(),_e(),b(),ge(),Oc(),Kt=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},vs=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Ba=(e,t,r,i,a,n,s=!1,o=!1)=>{let u=[],l=r[0].dims,d=l.length,p=D.normalizeAxes(a,d),f=!o&&p.length===0;l.forEach((y,$)=>{f||p.indexOf($)>=0?s&&u.push(1):u.push(y)});let h=u.length,m=D.size(u);return{name:e,shaderCache:t,getShaderSource:y=>{let $=[],w=A("_A",r[0].dataType,d),_=X("output",n,h),S=i(w,_,p),x=S[2];for(let z=0,P=0;z<d;z++)f||p.indexOf(z)>=0?(s&&P++,x=`for(var j${z}: u32 = 0; j${z} < ${l[z]}; j${z}++) {
                  ${S[2].includes("last_index")?`let last_index = j${z};`:""}
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
          ${S[0]}       // init ops for reduce max/min
          ${S[1]}
          ${x}
          ${S[3]}
          ${S.length===4?_.setByOffset("global_idx","value"):S.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:u,dataType:n}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...k(l,u)]})}},on=(e,t)=>{let r=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(i=>r.push(Number(i))),g({axes:r,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Zt=(e,t,r,i)=>{let a=e.inputs,n=a.length===1?r:on(a,r);e.compute(Ba(t,{hint:n.cacheKey,inputDependencies:["rank"]},[a[0]],n.noopWithEmptyAxes&&n.axes.length===0?vs:i,n.axes,a[0].dataType,n.keepDims,n.noopWithEmptyAxes),{inputs:[0]})},xs=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceLogSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},Ss=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceL1",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},Ts=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceL2",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},Es=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceLogSumExp",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},Is=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceMax",t,(r,i,a)=>{let n=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&n.push(r.indicesSet("input_indices",s,0));return[`${n.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},ks=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceMean",t,(r,i,a)=>{let n=1;for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&(n*=e.inputs[0].dims[s]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${i.type.value}(sum / ${n});`]})},Cs=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceMin",t,(r,i,a)=>{let n=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&n.push(`input_indices[${s}] = 0;`);return[`${n.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},zs=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceProd",t,(r,i)=>[`var value = ${i.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},As=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Os=(e,t)=>{Kt(e.inputs),Zt(e,"ReduceSumSquare",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Qt=(e,t,r)=>{if(t.length===0)return r;let i=1,a=1;for(let n=0;n<t.length;n++)t.indexOf(n)===-1?i*=e[n]:a*=e[n];return a<32&&i>1024},Rs=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ks(e,t):Oa(e,t)},Ms=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ss(e,t):jt(e,t)},Bs=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ts(e,t):Ht(e,t)},Ds=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Es(e,t):wr(e,t)},Ps=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Is(e,t):nt(e,t)},Us=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Cs(e,t):et(e,t)},Ns=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?zs(e,t):Pt(e,t)},Ls=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?As(e,t):Ra(e,t)},qs=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Os(e,t):Ma(e,t)},Vs=(e,t)=>{Qt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xs(e,t):$s(e,t)}}),ln,Fs,Ws,dn,Rc=T(()=>{Se(),b(),un(),ln=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},Fs=(e,t)=>{ln(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Ba("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},Ws=(e,t)=>{ln(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Ba("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},dn=e=>g(e)}),Gs,Da,js,Hs,Ks,ua,Zs,Qs,pn=T(()=>{Se(),_e(),bi(),ge(),Gs=(e,t)=>{let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4],o=e[5];if(s&&o)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=r.dims[0],l=r.dims[1],d=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(i.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(i.dims[0]!==d)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==i.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let p=a.dims[0]/3,f=p,h=f;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let S of t.qkvHiddenSizes)if(S%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");p=t.qkvHiddenSizes[0],f=t.qkvHiddenSizes[1],h=t.qkvHiddenSizes[2]}let m=l;if(p!==f)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==p+f+h)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let y=0;if(s){if(f!==h)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==f/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(y=s.dims[3])}let $=m+y,w=-1,_=0;if(n)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(o){if(o.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(o.dims[0]!==u||o.dims[1]!==t.numHeads||o.dims[2]!==l||o.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:l,pastSequenceLength:y,kvSequenceLength:m,totalSequenceLength:$,maxSequenceLength:w,inputHiddenSize:d,hiddenSize:p,vHiddenSize:h,headSize:Math.floor(p/t.numHeads),vHeadSize:Math.floor(h/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:_,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Da=(e,t,r)=>t&&e?`
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
    `,js=(e,t,r,i,a,n,s,o)=>{let u=R(s?1:n),l=64,d=n/u;d<l&&(l=32);let p=Math.ceil(n/u/l),f=[{type:12,data:t},{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:d},{type:12,data:p}],h=O(e.dataType,u),m=C(1,u),y=["type"];s&&y.push("type"),o&&y.push("type");let $=w=>{let _=X("x",e.dataType,e.dims,u),S=[_],x=s?A("seq_lens",s.dataType,s.dims):void 0;x&&S.push(x);let z=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;z&&S.push(z);let P=C(e.dataType),U=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${w.registerUniforms(U).declareVariables(...S)}
  ${w.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Da(x,z,!1)}
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
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${h};${u}`,inputDependencies:y},getShaderSource:$,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:a,z:t*r},programUniforms:f})}},Hs=(e,t,r,i,a,n,s,o,u)=>{let l=s+n.kvSequenceLength,d=[n.batchSize,n.numHeads,n.sequenceLength,l],p=e>1&&i,f=n.kvNumHeads?n.kvNumHeads:n.numHeads,h=p?[n.batchSize,f,l,n.headSize]:void 0,m=n.nReps?n.nReps:1,y=n.scale===0?1/Math.sqrt(n.headSize):n.scale,$=R(n.headSize),w=n.headSize/$,_=12,S={x:Math.ceil(l/_),y:Math.ceil(n.sequenceLength/_),z:n.batchSize*n.numHeads},x=[{type:12,data:n.sequenceLength},{type:12,data:w},{type:12,data:l},{type:12,data:n.numHeads},{type:12,data:n.headSize},{type:1,data:y},{type:12,data:s},{type:12,data:n.kvSequenceLength},{type:12,data:m}],z=p&&i&&D.size(i.dims)>0,P=["type","type"];z&&P.push("type"),a&&P.push("type"),o&&P.push("type"),u&&P.push("type");let U=[{dims:d,dataType:t.dataType,gpuDataType:0}];p&&U.push({dims:h,dataType:t.dataType,gpuDataType:0});let q=G=>{let ie=A("q",t.dataType,t.dims,$),xe=A("key",r.dataType,r.dims,$),he=[ie,xe];if(z){let Ee=A("past_key",i.dataType,i.dims,$);he.push(Ee)}a&&he.push(A("attention_bias",a.dataType,a.dims));let $e=o?A("seq_lens",o.dataType,o.dims):void 0;$e&&he.push($e);let Fe=u?A("total_sequence_length_input",u.dataType,u.dims):void 0;Fe&&he.push(Fe);let Oe=X("output",t.dataType,d),we=[Oe];p&&we.push(X("present_key",t.dataType,h,$));let Re=C(1,$),ye=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${_}u;

  var<workgroup> tileQ: array<${ie.type.storage}, ${_*_}>;
  var<workgroup> tileK: array<${ie.type.storage}, ${_*_}>;
  ${G.registerUniforms(ye).declareVariables(...he,...we)}
  ${G.mainStart([_,_,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${m===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${m===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Da($e,Fe,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${z&&p?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${p?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${Re}(0);
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
          value += ${Re}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch($){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${$}`)}})()};
        output[outputIdx] = ${Oe.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${$};${a!==void 0};${i!==void 0};${e}`,inputDependencies:P},getRunData:()=>({outputs:U,dispatchGroup:S,programUniforms:x}),getShaderSource:q}},Ks=(e,t,r,i,a,n,s=void 0,o=void 0)=>{let u=n+a.kvSequenceLength,l=a.nReps?a.nReps:1,d=a.vHiddenSize*l,p=e>1&&i,f=a.kvNumHeads?a.kvNumHeads:a.numHeads,h=p?[a.batchSize,f,u,a.headSize]:void 0,m=[a.batchSize,a.sequenceLength,d],y=12,$={x:Math.ceil(a.vHeadSize/y),y:Math.ceil(a.sequenceLength/y),z:a.batchSize*a.numHeads},w=[{type:12,data:a.sequenceLength},{type:12,data:u},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:12,data:d},{type:12,data:n},{type:12,data:a.kvSequenceLength},{type:12,data:l}],_=p&&i&&D.size(i.dims)>0,S=["type","type"];_&&S.push("type"),s&&S.push("type"),o&&S.push("type");let x=[{dims:m,dataType:t.dataType,gpuDataType:0}];p&&x.push({dims:h,dataType:t.dataType,gpuDataType:0});let z=P=>{let U=A("probs",t.dataType,t.dims),q=A("v",r.dataType,r.dims),G=[U,q];_&&G.push(A("past_value",i.dataType,i.dims));let ie=s?A("seq_lens",s.dataType,s.dims):void 0;s&&G.push(ie);let xe=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;o&&G.push(xe);let he=[X("output",t.dataType,m)];p&&he.push(X("present_value",t.dataType,h));let $e=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${y}u;
  var<workgroup> tileQ: array<${U.type.value}, ${y*y}>;
  var<workgroup> tileV: array<${U.type.value}, ${y*y}>;
  ${P.registerUniforms($e).declareVariables(...G,...he)}
  ${P.mainStart([y,y,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Da(ie,xe,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${_&&p?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${p?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${U.type.storage}(0);
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
  }`};return{name:"AttentionScore",shaderCache:{hint:`${i!==void 0};${e}`,inputDependencies:S},getRunData:()=>({outputs:x,dispatchGroup:$,programUniforms:w}),getShaderSource:z}},ua=(e,t,r,i,a,n,s,o,u,l,d=void 0,p=void 0)=>{let f=Math.min(e.outputCount,1+(s?1:0)+(o?1:0)),h=f>1?l.pastSequenceLength:0,m=h+l.kvSequenceLength,y=u&&D.size(u.dims)>0?u:void 0,$=[t,r];f>1&&s&&D.size(s.dims)>0&&$.push(s),y&&$.push(y),d&&$.push(d),p&&$.push(p);let w=e.compute(Hs(f,t,r,s,y,l,h,d,p),{inputs:$,outputs:f>1?[-1,1]:[-1]})[0];e.compute(js(w,l.batchSize,l.numHeads,h,l.sequenceLength,m,d,p),{inputs:d&&p?[w,d,p]:[w],outputs:[]});let _=[w,i];f>1&&o&&D.size(o.dims)>0&&_.push(o),d&&_.push(d),p&&_.push(p),e.compute(Ks(f,w,i,o,l,h,d,p),{inputs:_,outputs:f>1?[0,2]:[0]})},Zs=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],i=t.sequenceLength,a=t.inputHiddenSize,n=t.headSize,s=12,o={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},u=[e.inputs[0],e.inputs[1],e.inputs[2]],l=[{type:12,data:i},{type:12,data:a},{type:12,data:n},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],d=p=>{let f=X("output_q",u[0].dataType,r),h=X("output_k",u[0].dataType,r),m=X("output_v",u[0].dataType,r),y=A("input",u[0].dataType,u[0].dims),$=A("weight",u[1].dataType,u[1].dims),w=A("bias",u[2].dataType,u[2].dims),_=y.type.storage,S=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${_}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${_}, ${s*s}>;
  var<workgroup> tileWeightK: array<${_}, ${s*s}>;
  var<workgroup> tileWeightV: array<${_}, ${s*s}>;
  ${p.registerUniforms(S).declareVariables(y,$,w,f,h,m)}
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
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:l}),getShaderSource:d},{inputs:u,outputs:[-1,-1,-1]})},Qs=(e,t)=>{let r=Gs(e.inputs,t),[i,a,n]=Zs(e,r);return ua(e,i,a,n,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r)}}),Xs,Ys,Js,eo,Mc=T(()=>{ht(),Se(),_e(),b(),ge(),Xs=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(i,a,n)=>{let s=a.length;if(s!==i.length)throw new Error(`${n}: num dimensions != ${s}`);a.forEach((o,u)=>{if(o!==i[u])throw new Error(`${n}: dim[${u}] do not match`)})};if(e[0].dims.length>1){let i=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,i,"Invalid input scale"),r(e[2].dims,i,"Invalid input B"),r(e[3].dims,i,"Invalid input mean"),r(e[4].dims,i,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},Ys=(e,t)=>{let{epsilon:r,spatial:i,format:a}=t,n=e[0].dims,s=i?R(n[n.length-1]):1,o=a==="NHWC"&&n.length>1?s:1,u=D.size(n)/s,l=i,d=l?n.length:n,p=A("x",e[0].dataType,e[0].dims,s),f=A("scale",e[1].dataType,e[1].dims,o),h=A("bias",e[2].dataType,e[2].dims,o),m=A("inputMean",e[3].dataType,e[3].dims,o),y=A("inputVar",e[4].dataType,e[4].dims,o),$=X("y",e[0].dataType,d,s),w=()=>{let S="";if(i)S=`let cOffset = ${n.length===1?"0u":a==="NHWC"?`outputIndices[${n.length-1}] / ${s}`:"outputIndices[1]"};`;else if(a==="NCHW")S=`
            ${$.indicesSet("outputIndices","0","0")}
            let cOffset = ${$.indicesToOffset("outputIndices")};`;else{S=`var cIndices = ${f.type.indices}(0);
                       cIndices[0] = outputIndices[${n.length-1}];`;for(let x=1;x<f.rank;x++)S+=`cIndices[${x}] = outputIndices[${x}];`;S+=`let cOffset = ${f.indicesToOffset("cIndices")};`}return S},_=S=>`
  const epsilon = ${r};
  ${S.registerUniform("outputSize","u32").declareVariables(p,f,h,m,y,$)}
  ${S.mainStart()}
  ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${$.offsetToIndices(`global_idx * ${s}`)};
    ${w()}
    let scale = ${f.getByOffset("cOffset")};
    let bias = ${h.getByOffset("cOffset")};
    let inputMean = ${m.getByOffset("cOffset")};
    let inputVar = ${y.getByOffset("cOffset")};
    let x = ${p.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${$.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${i}_${s}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:_,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l?[{type:12,data:u},...k(n)]:[{type:12,data:u}]})}},Js=e=>g(e),eo=(e,t)=>{let{inputs:r,outputCount:i}=e,a=Js({...t,outputCount:i});if(K.webgpu.validateInputContent&&Xs(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(Ys(r,a))}}),to,ro,io,Bc=T(()=>{_e(),ge(),to=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},ro=e=>{let t=e[0].dims,r=e[0].dims[2],i=D.size(t)/4,a=e[0].dataType,n=A("input",a,t,4),s=A("bias",a,[r],4),o=A("residual",a,t,4),u=X("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:l=>`
  const channels = ${r}u / 4;
  ${l.declareVariables(n,s,o,u)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let value = ${n.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${o.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},io=e=>{to(e.inputs),e.compute(ro(e.inputs))}}),ao,Ge,no,so,oo,uo,lo,po,co,fo,ho,mo,go,yo,_o,wo,la,bo,Pa,$o,vo,xo,So,To,Eo,Io,ko,Co,zo,Ao,Oo,Ro,Mo,Bo,Do,cn,Po,fn,hn,Uo,No,Lo,qo,Vo,Fo,mn=T(()=>{Se(),_e(),b(),ge(),ao=(e,t,r,i,a,n,s)=>{let o=Math.ceil(t/4),u="";typeof a=="string"?u=`${a}(a)`:u=a("a");let l=A("inputData",r,[o],4),d=X("outputData",i,[o],4),p=[{name:"vec_size",type:"u32"}];return s&&p.push(...s),`
      ${e.registerUniforms(p).declareVariables(l,d)}

  ${n??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${d.setByOffset("global_idx",u)}
  }`},Ge=(e,t,r,i,a,n=e.dataType,s,o)=>{let u=[{type:12,data:Math.ceil(D.size(e.dims)/4)}];return s&&u.push(...s),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:l=>ao(l,D.size(e.dims),e.dataType,n,r,i,o),getRunData:l=>({outputs:[{dims:e.dims,dataType:n}],dispatchGroup:{x:Math.ceil(D.size(l[0].dims)/64/4)},programUniforms:u})}},no=e=>{e.compute(Ge(e.inputs[0],"Abs","abs"))},so=e=>{e.compute(Ge(e.inputs[0],"Acos","acos"))},oo=e=>{e.compute(Ge(e.inputs[0],"Acosh","acosh"))},uo=e=>{e.compute(Ge(e.inputs[0],"Asin","asin"))},lo=e=>{e.compute(Ge(e.inputs[0],"Asinh","asinh"))},po=e=>{e.compute(Ge(e.inputs[0],"Atan","atan"))},co=e=>{e.compute(Ge(e.inputs[0],"Atanh","atanh"))},fo=e=>g(e),ho=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(Ge(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},mo=e=>{let t,r,i=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=i?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=i?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return g({min:t,max:r})},go=(e,t)=>{let r=t||mo(e.inputs),i=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${i}>(uniforms.min), vec4<${i}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:i},{name:"max",type:i}]),{inputs:[0]})},yo=e=>{e.compute(Ge(e.inputs[0],"Ceil","ceil"))},_o=e=>{e.compute(Ge(e.inputs[0],"Cos","cos"))},wo=e=>{e.compute(Ge(e.inputs[0],"Cosh","cosh"))},la=e=>g(e),bo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Elu",i=>`elu_vf32(${i})`,`
  const elu_alpha_ = ${r}(${t.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Pa=(e="f32")=>`
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
}`,$o=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Pa(t)))},vo=e=>{e.compute(Ge(e.inputs[0],"Exp","exp"))},xo=e=>{e.compute(Ge(e.inputs[0],"Floor","floor"))},So=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Pa(t)))},To=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"LeakyRelu",i=>`select(leaky_relu_alpha_ * ${i}, ${i}, ${i} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},Eo=e=>{e.compute(Ge(e.inputs[0],"Not",t=>`!${t}`))},Io=e=>{e.compute(Ge(e.inputs[0],"Neg",t=>`-${t}`))},ko=e=>{e.compute(Ge(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Co=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},zo=e=>{e.compute(Ge(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},Ao=e=>g(e),Oo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"HardSigmoid",i=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${i} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},Ro=e=>{e.compute(Ge(e.inputs[0],"Sin","sin"))},Mo=e=>{e.compute(Ge(e.inputs[0],"Sinh","sinh"))},Bo=e=>{e.compute(Ge(e.inputs[0],"Sqrt","sqrt"))},Do=e=>{e.compute(Ge(e.inputs[0],"Tan","tan"))},cn=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Po=e=>{e.compute(Ge(e.inputs[0],"Tanh",cn))},fn=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${cn("v")};
}
`,hn=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Uo=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"FastGelu",hn,fn(t),void 0,e.inputs[0].dataType))},No=(e,t)=>{let r=C(e.inputs[0].dataType);return e.compute(Ge(e.inputs[0],"ThresholdedRelu",i=>`select(vec4<${r}>(0.0), ${i}, ${i} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},Lo=e=>{e.compute(Ge(e.inputs[0],"Log","log"))},qo=(e,t)=>`
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
`,Vo=e=>`quick_gelu_impl(${e})`,Fo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"QuickGelu",Vo,qo(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Wo,Go,jo,Dc=T(()=>{_e(),ge(),mn(),Wo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Go=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=A("input",e[0].dataType,e[0].dims,4),i=A("bias",e[0].dataType,[e[0].dims[2]],4),a=X("output",e[0].dataType,t,4),n=D.size(t)/4,s=O(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)}}),getShaderSource:o=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${o.declareVariables(r,i,a)}

  ${Pa(s)}

  ${o.mainStart()}
    ${o.guardAgainstOutOfBoundsWorkgroupSizes(n)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${a.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},jo=e=>{Wo(e.inputs),e.compute(Go(e.inputs))}}),Ho,Ko,Xt,Zo,Qo,Xo,Yo,Jo,eu,tu,ru,iu,au,Pc=T(()=>{Se(),_e(),ge(),Ho=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f,h;typeof o=="string"?f=h=(_,S)=>`${o}((${_}),(${S}))`:typeof o=="function"?f=h=o:(f=o.scalar,h=o.vector);let m=X("outputData",d,i.length,4),y=A("aData",u,t.length,4),$=A("bData",l,r.length,4),w;if(a)if(n){let _=D.size(t)===1,S=D.size(r)===1,x=t.length>0&&t[t.length-1]%4===0,z=r.length>0&&r[r.length-1]%4===0;_||S?w=m.setByOffset("global_idx",h(_?`${y.type.value}(${y.getByOffset("0")}.x)`:y.getByOffset("global_idx"),S?`${$.type.value}(${$.getByOffset("0")}.x)`:$.getByOffset("global_idx"))):w=`
            let outputIndices = ${m.offsetToIndices("global_idx * 4u")};
            let offsetA = ${y.broadcastedIndicesToOffset("outputIndices",m)};
            let offsetB = ${$.broadcastedIndicesToOffset("outputIndices",m)};
            ${m.setByOffset("global_idx",h(s||x?y.getByOffset("offsetA / 4u"):`${y.type.value}(${y.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||z?$.getByOffset("offsetB / 4u"):`${$.type.value}(${$.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else w=m.setByOffset("global_idx",h(y.getByOffset("global_idx"),$.getByOffset("global_idx")));else{if(!n)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let _=(S,x,z="")=>{let P=`aData[indexA${x}][componentA${x}]`,U=`bData[indexB${x}][componentB${x}]`;return`
            let outputIndices${x} = ${m.offsetToIndices(`global_idx * 4u + ${x}u`)};
            let offsetA${x} = ${y.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let offsetB${x} = ${$.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let indexA${x} = offsetA${x} / 4u;
            let indexB${x} = offsetB${x} / 4u;
            let componentA${x} = offsetA${x} % 4u;
            let componentB${x} = offsetB${x} % 4u;
            ${S}[${x}] = ${z}(${f(P,U)});
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
      }`},Ko=(e,t,r,i,a,n,s=r.dataType)=>{let o=r.dims.map(y=>Number(y)??1),u=i.dims.map(y=>Number(y)??1),l=!D.areEqual(o,u),d=o,p=D.size(o),f=!1,h=!1,m=[l];if(l){let y=er.calcShape(o,u,!1);if(!y)throw new Error("Can't perform binary op on the given tensors");d=y.slice(),p=D.size(d);let $=D.size(o)===1,w=D.size(u)===1,_=o.length>0&&o[o.length-1]%4===0,S=u.length>0&&u[u.length-1]%4===0;m.push($),m.push(w),m.push(_),m.push(S);let x=1;for(let z=1;z<d.length;z++){let P=o[o.length-z],U=u[u.length-z];if(P===U)x*=P;else break}x%4===0?(h=!0,f=!0):($||w||_||S)&&(f=!0)}else f=!0;return m.push(f),{name:e,shaderCache:{hint:t+m.map(y=>y.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:y=>Ho(y,o,u,d,f,l,h,a,r.dataType,i.dataType,s,n),getRunData:()=>({outputs:[{dims:d,dataType:s}],dispatchGroup:{x:Math.ceil(p/64/4)},programUniforms:[{type:12,data:Math.ceil(D.size(d)/4)},...k(o,u,d)]})}},Xt=(e,t,r,i,a,n)=>{e.compute(Ko(t,a??"",e.inputs[0],e.inputs[1],r,i,n))},Zo=e=>{Xt(e,"Add",(t,r)=>`${t}+${r}`)},Qo=e=>{Xt(e,"Div",(t,r)=>`${t}/${r}`)},Xo=e=>{Xt(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},Yo=e=>{Xt(e,"Mul",(t,r)=>`${t}*${r}`)},Jo=e=>{let t=A("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Xt(e,"Pow",{scalar:(r,i)=>`pow_custom(${r},${i})`,vector:(r,i)=>`pow_vector_custom(${r},${i})`},`
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
      `)},eu=e=>{Xt(e,"Sub",(t,r)=>`${t}-${r}`)},tu=e=>{Xt(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},ru=e=>{Xt(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},iu=e=>{Xt(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},au=e=>{Xt(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),nu,su,ou,uu,lu,du,Uc=T(()=>{Se(),_e(),b(),ge(),nu=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,i=e[r],a=i.dataType,n=i.dims.length;e.forEach((s,o)=>{if(o!==r){if(s.dataType!==a)throw new Error("input tensors should be one type");if(s.dims.length!==n)throw new Error("input tensors should have the same shape");s.dims.forEach((u,l)=>{if(l!==t&&u!==i.dims[l])throw new Error("non concat dimensions must match")})}})},su=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,ou=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;++a){let n=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?i.push(n):a===0?i.push(`if (inputIndex == ${a}u) { ${n} }`):a===r-1?i.push(`else { ${n} }`):i.push(`else if (inputIndex == ${a}) { ${n} }`)}return i.join(`
`)},uu=(e,t,r,i)=>{let a=D.size(r),n=new Array(e.length),s=new Array(e.length),o=0,u=[],l=[],d=[{type:12,data:a}];for(let y=0;y<e.length;++y)o+=e[y].dims[t],n[y]=o,l.push(e[y].dims.length),s[y]=A(`input${y}`,i,l[y]),u.push("rank"),d.push({type:12,data:n[y]});for(let y=0;y<e.length;++y)d.push(...k(e[y].dims));d.push(...k(r));let p=X("output",i,r.length),f=p.indicesGet("indices",t),h=Array.from(Array(n.length).keys()).map(y=>`uniforms.sizeInConcatAxis${y}`).join(","),m=y=>`

  ${(()=>{y.registerUniform("outputSize","u32");for(let $=0;$<e.length;$++)y.registerUniform(`sizeInConcatAxis${$}`,"u32");return y.declareVariables(...s,p)})()}

  ${su(n.length,h)}

  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${p.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${f});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${n.length}u>(${h});
      ${f} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${ou(s,p)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:i}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:d}),getShaderSource:m}},lu=(e,t)=>{let r=e.inputs,i=r[0].dims,a=D.normalizeAxis(t.axis,i.length);nu(r,a);let n=i.slice();n[a]=r.reduce((o,u)=>o+(u.dims.length>a?u.dims[a]:0),0);let s=r.filter(o=>D.size(o.dims)>0);e.compute(uu(s,a,n,r[0].dataType),{inputs:s})},du=e=>g({axis:e.axis})}),Yr,Jr,ei,gn,ti=T(()=>{Se(),_e(),Yr=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},Jr=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},ei=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},gn=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,i]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:i}}else if(t==="Clip"){let[r,i]=(e==null?void 0:e.activation_params)||[Yi,Vt];return{activation:t,clipMax:i,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),yt,pu,yn=T(()=>{yt=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},pu=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),cu,Nc=T(()=>{cu=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),da,_n,wn=T(()=>{Se(),_e(),ge(),ti(),da=(e,t,r,i,a)=>{let n=i-r;return`
      ${Array.from({length:r}).map((s,o)=>`
      if (${B(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,B(a,o+n,i))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join("")}
`},_n=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s[s.length-2],l=o[o.length-1],d=s[s.length-1],p=R(l),f=R(d),h=R(u),m=D.size(r)/p/h,y=e.length>2,$=i?i.slice(0,-2):r.slice(0,-2),w=[D.size($),u,l],_=[{type:12,data:m},{type:12,data:u},{type:12,data:l},{type:12,data:d}];Jr(t,_),_.push(...k($,s,o)),y&&_.push(...k(e[2].dims)),_.push(...k(w));let S=x=>{let z=ze("batch_dims",e[0].dataType,$.length),P=A("a",e[0].dataType,s.length,f),U=A("b",e[1].dataType,o.length,p),q=X("output",e[0].dataType,w.length,p),G=O(q.type.tensor),ie=Yr(t,q.type.value,G),xe=[P,U],he="";if(y){let Oe=a?p:1;xe.push(A("bias",e[2].dataType,e[2].dims.length,Oe)),he=`${a?`value += bias[col / ${Oe}];`:`value += ${q.type.value}(bias[row + i]);`}`}let $e=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];ei(t,$e);let Fe=()=>{let Oe=`var a_data: ${P.type.value};`;for(let we=0;we<f;we++)Oe+=`
              let b_data${we} = b[(b_offset + (k + ${we}) * uniforms.N + col) / ${p}];`;for(let we=0;we<h;we++){Oe+=`a_data = a[(a_offset + (row + ${we}) * uniforms.K + k) / ${f}];`;for(let Re=0;Re<f;Re++)Oe+=`
            values[${we}] = fma(${U.type.value}(a_data${f===1?"":`[${Re}]`}), b_data${Re}, values[${we}]);
`}return Oe};return`
  ${x.registerUniforms($e).registerInternalVariables(z).declareVariables(...xe,q)}
  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${p})) * ${p};
    var index1 = global_idx / (uniforms.N / ${p});
    let stride1 = uniforms.M / ${h};
    let row = (index1 % stride1) * ${h};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${z.offsetToIndices("batch")};`}

    var a_indices: ${P.type.indices};
    ${da("a_indices",P,P.rank-2,z.rank,"batch_indices")}
    ${P.indicesSet("a_indices",P.rank-2,0)}
    ${P.indicesSet("a_indices",P.rank-1,0)}
    let a_offset = ${P.indicesToOffset("a_indices")};

    var b_indices: ${U.type.indices};
    ${da("b_indices",U,U.rank-2,z.rank,"batch_indices")}
    ${U.indicesSet("b_indices",U.rank-2,0)}
    ${U.indicesSet("b_indices",U.rank-1,0)}
    let b_offset = ${U.indicesToOffset("b_indices")};
    var values: array<${q.type.value}, ${h}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${f}) {
      ${Fe()}
    }
    for (var i = 0u; i < ${h}u; i++) {
      var value = values[i];
      ${he}
      ${ie}
      let cur_indices = ${q.type.indices}(batch, row + i, col);
      let offset = ${q.indicesToOffset("cur_indices")};
      ${q.setByOffset(`offset / ${p}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${p};${f};${h};${a}`,inputDependencies:y?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:_}),getShaderSource:S}}}),fu,hu,bn,$n,mu,vn,gu,Ua,xn=T(()=>{Se(),_e(),ge(),ti(),wn(),yn(),fu=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,hu=(e,t)=>e?`
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
        }`,bn=(e,t,r="f32",i,a=!1,n=32,s=!1,o=32)=>{let u=t[1]*e[1],l=t[0]*e[0],d=a?u:n,p=a?n:u,f=d/t[0],h=n/t[1];if(!((a&&f===4&&e[1]===4||!a&&(f===3||f===4))&&d%t[0]===0&&n%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${a} is true, innerElementSize ${f} and workPerThread[1] ${e[1]} must be 4.
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
          ${fu(a,i)}
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

          ${hu(a,f)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},$n=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,mu=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",vn=(e,t,r="f32",i,a=!1,n=32,s=!1,o=32,u=!1)=>{let l=e[1]*t[1],d=e[0]*t[0],p=a?l:n,f=a?n:l;if(!(f%t[1]===0&&p%t[0]===0&&n%t[1]===0))throw new Error(`tileAHight ${f} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${p} must be divisible by workgroupSize[0]${t[0]}, tileInner ${n} must be divisible by workgroupSize[1]${t[1]}`);let h=f/t[1],m=p/t[0],y=n/t[1],$=u?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${d};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${f}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${p}; inputCol = inputCol + ${t[0]}) {
          ${$n(a,i)}
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
      ${$n(a,i)}
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
      ${mu(a)}
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
`},gu=(e,t,r,i,a=!1)=>{let[n,s,o,u]=i,l=O(i[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${yt(e,l)} {
      var value = ${yt(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${s.type.indices};
        ${da("aIndices",s,s.rank-2,n.rank,"batchIndices")}
        ${s.indicesSet("aIndices",s.rank-2,"u32(row)")}
        ${s.indicesSet("aIndices",s.rank-1,"u32(colIn)")}
        value = ${s.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${yt(e,l)} {
      var value = ${yt(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${o.type.indices};
        ${da("bIndices",o,o.rank-2,n.rank,"batchIndices")}
        ${o.indicesSet("bIndices",o.rank-2,"u32(row)")}
        ${o.indicesSet("bIndices",o.rank-1,"u32(colIn)")}
        value = ${o.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${yt(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${a?"bias[colIn]":`${yt(e,l)}(bias[row])`};`:""}
        ${r}
        ${u.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Ua=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s.slice(0,-2),l=o.slice(0,-2),d=i?i.slice(0,-2):r.slice(0,-2),p=D.size(d),f=s[s.length-2],h=s[s.length-1],m=o[o.length-1],y=h%4===0&&m%4===0,$=f<=8?[4,1,1]:[4,4,1],w=[8,8,1],_=[Math.ceil(m/w[0]/$[0]),Math.ceil(f/w[1]/$[1]),Math.ceil(p/w[2]/$[2])],S=y?4:1,x=[...u,f,h/S],z=x.length,P=[...l,h,m/S],U=P.length,q=[p,f,m/S],G=[{type:6,data:f},{type:6,data:m},{type:6,data:h}];Jr(t,G),G.push(...k(d,x,P));let ie=["rank","rank"],xe=e.length>2;xe&&(G.push(...k(e[2].dims)),ie.push("rank")),G.push(...k(q));let he=$e=>{let Fe=d.length,Oe=ze("batchDims",e[0].dataType,Fe,1),we=O(e[0].dataType),Re=A("a",e[0].dataType,z,S),ye=A("b",e[1].dataType,U,S),Ee=X("result",e[0].dataType,q.length,S),wt=[Re,ye];if(xe){let Dt=a?S:1;wt.push(A("bias",e[2].dataType,e[2].dims.length,Dt))}let F=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];ei(t,F);let ae=O(Ee.type.tensor),be=Yr(t,Ee.type.value,ae),Be=gu(S,xe,be,[Oe,Re,ye,Ee],a);return`
  ${$e.registerUniforms(F).registerInternalVariables(Oe).declareVariables(...wt,Ee)}
  ${Be}
  ${y?bn($,w,we,Oe):vn($,w,we,Oe)}
                   `};return{name:"MatMul",shaderCache:{hint:`${$};${t.activation};${y};${a}`,inputDependencies:ie},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:_[0],y:_[1],z:_[2]},programUniforms:G}),getShaderSource:he}}}),yu,_u,Lc=T(()=>{Se(),Mt(),ge(),ti(),yn(),Nc(),xn(),yu=(e,t,r,i,a=!1,n,s=4,o=4,u=4,l="f32")=>{let d=G=>{switch(G){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${G} is not supported.`)}},p=G=>{switch(G){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${G} is not supported.`)}},f=e?`
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
    var resData = ${yt(s,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${m} && xCol >= 0 && xCol < ${y}) {
      ${f}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${d(s)}
    }
    return resData;`,S=e?t&&i?`
    let col = colIn * ${s};
    ${_}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${_}
    }
    return ${yt(s,l)}(0.0);`:i&&r?`
    let col = colIn * ${s};
    ${_}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${_}
    }
    return ${yt(s,l)}(0.0);`,x=e?i&&r?p(o):`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${p(o)}
    }
    return ${yt(o,l)}(0.0);`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${p(o)}
    }
    return ${yt(o,l)}(0.0);`,z=yt(u,l),P=yt(e?s:o,l),U=yt(e?o:s,l),q=Yr(n,z,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${P} {
      ${e?S:x}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${U} {
      ${e?x:S}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${z}) {
      let col = colIn * ${u};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${h}
      ${pu(a)}
      ${q}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},_u=(e,t,r,i,a,n,s,o,u)=>{let l=t.format==="NHWC",d=l?e[0].dims[3]:e[0].dims[1],p=r[0],f=l?r[2]:r[3],h=l?r[1]:r[2],m=l?r[3]:r[1],y=l&&(d%4===0||d%3===0)&&m%4===0,$=l?m:f*h,w=l?f*h:m,_=[8,8,1],S=i<=8?[4,1,1]:[4,4,1],x=[Math.ceil($/_[0]/S[0]),Math.ceil(w/_[1]/S[1]),Math.ceil(p/_[2]/S[2])];De("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${x}`);let z=y?l&&d%4!==0?3:4:1,P=_[1]*S[1],U=_[0]*S[0],q=Math.max(_[0]*z,_[1]),G=i%P===0,ie=a%U===0,xe=n%q===0,he=y?[z,4,4]:[1,1,1],$e=[{type:6,data:i},{type:6,data:a},{type:6,data:n},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Jr(t,$e),$e.push(...k(e[0].dims,e[1].dims));let Fe=["rank","rank"];s&&($e.push(...k(e[2].dims)),Fe.push("rank")),$e.push(...k(r));let Oe=we=>{let Re=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];ei(t,Re);let ye=y?4:1,Ee=O(e[0].dataType),wt=`
      fn setOutputAtIndex(flatIndex : i32, value : ${y?`vec4<${Ee}>`:Ee}) {
        result[flatIndex] = ${y?`vec4<${Ee}>`:Ee}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${y?`vec4<${Ee}>`:Ee}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${y?"/ 4":""}, value);
      }`,F=A("x",e[0].dataType,e[0].dims.length,z===3?1:z),ae=A("w",e[1].dataType,e[1].dims.length,ye),be=[F,ae],Be=X("result",e[0].dataType,r.length,ye);if(s){let Dt=A("bias",e[2].dataType,e[2].dims.length,ye);be.push(Dt),wt+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${y?`vec4<${Ee}>`:Ee} {
          return bias[coords.${l?"w":"y"}${y?"/ 4":""}];
        }`}return`
        ${cu("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${we.registerUniforms(Re).declareVariables(...be,Be)}
        ${wt}
        ${yu(l,G,ie,xe,s,t,he[0],he[1],he[2],Ee)}
        ${y?bn(S,_,Ee,void 0,!l,q):vn(S,_,Ee,void 0,!l,q,!1,void 0,o)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${z};${y};${G};${ie};${xe};${P};${U};${q}`,inputDependencies:Fe},getRunData:()=>({outputs:[{dims:u?u(r):r,dataType:e[0].dataType}],dispatchGroup:{x:x[0],y:x[1],z:x[2]},programUniforms:$e}),getShaderSource:Oe}}}),wu,Sn,pa,bu,Tn,$u,vu,xu,qc=T(()=>{Se(),Mt(),_e(),ge(),ti(),yn(),wu=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},Sn=e=>typeof e=="number"?[e,e,e]:e,pa=(e,t)=>t<=1?e:e+(e-1)*(t-1),bu=(e,t,r,i=1)=>{let a=pa(t,i);return Math.floor((e[0]*(r-1)-r+a)/2)},Tn=(e,t,r,i,a)=>{a==null&&(a=bu(e,t[0],i[0]));let n=[0,0,0,r];for(let s=0;s<3;s++)e[s]+2*a>=t[s]&&(n[s]=Math.trunc((e[s]-t[s]+2*a)/i[s]+1));return n},$u=(e,t,r,i,a,n,s,o,u,l)=>{let d,p,f,h;if(e==="VALID"&&(e=0),typeof e=="number"){d={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=Tn([t,r,i,1],[o,u,l],1,[a,n,s],e);p=m[0],f=m[1],h=m[2]}else if(Array.isArray(e)){if(!e.every((y,$,w)=>y===w[0]))throw Error(`Unsupported padding parameter: ${e}`);d={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=Tn([t,r,i,1],[o,u,l],1,[a,n,s],e[0]);p=m[0],f=m[1],h=m[2]}else if(e==="SAME_UPPER"){p=Math.ceil(t/a),f=Math.ceil(r/n),h=Math.ceil(i/s);let m=(p-1)*a+o-t,y=(f-1)*n+u-r,$=(h-1)*s+l-i,w=Math.floor(m/2),_=m-w,S=Math.floor(y/2),x=y-S,z=Math.floor($/2),P=$-z;d={top:S,bottom:x,left:z,right:P,front:w,back:_}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:d,outDepth:p,outHeight:f,outWidth:h}},vu=(e,t,r,i,a,n=!1,s="channelsLast")=>{let o,u,l,d,p;if(s==="channelsLast")[o,u,l,d,p]=e;else if(s==="channelsFirst")[o,p,u,l,d]=e;else throw new Error(`Unknown dataFormat ${s}`);let[f,,h,m,y]=t,[$,w,_]=Sn(r),[S,x,z]=Sn(i),P=pa(h,S),U=pa(m,x),q=pa(y,z),{padInfo:G,outDepth:ie,outHeight:xe,outWidth:he}=$u(a,u,l,d,$,w,_,P,U,q),$e=n?f*p:f,Fe=[0,0,0,0,0];return s==="channelsFirst"?Fe=[o,$e,ie,xe,he]:s==="channelsLast"&&(Fe=[o,ie,xe,he,$e]),{batchSize:o,dataFormat:s,inDepth:u,inHeight:l,inWidth:d,inChannels:p,outDepth:ie,outHeight:xe,outWidth:he,outChannels:$e,padInfo:G,strideDepth:$,strideHeight:w,strideWidth:_,filterDepth:h,filterHeight:m,filterWidth:y,effectiveFilterDepth:P,effectiveFilterHeight:U,effectiveFilterWidth:q,dilationDepth:S,dilationHeight:x,dilationWidth:z,inShape:e,outShape:Fe,filterShape:t}},xu=(e,t,r,i,a,n)=>{let s=n==="channelsLast";s?e[0].dims[3]:e[0].dims[1];let o=[64,1,1],u={x:r.map(($,w)=>w)},l=[Math.ceil(wu(u.x.map($=>r[$]))/o[0]),1,1];De("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let d=1,p=D.size(r),f=[{type:12,data:p},{type:12,data:i},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];Jr(t,f),f.push(...k(e[0].dims,e[1].dims));let h=["rank","rank"],m=e.length===3;m&&(f.push(...k(e[2].dims)),h.push("rank")),f.push(...k(r));let y=$=>{let w=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:i.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];ei(t,w);let _=1,S=O(e[0].dataType),x=A("x",e[0].dataType,e[0].dims.length,d),z=A("W",e[1].dataType,e[1].dims.length,_),P=[x,z],U=X("result",e[0].dataType,r.length,_),q="";if(m){let xe=A("bias",e[2].dataType,e[2].dims.length,_);P.push(xe),q+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${S} {
          return bias[${s?B("coords",4,5):B("coords",1,5)}];
        }`}let G=yt(d,S),ie=Yr(t,G,S);return`
            ${q}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${x.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${z.getByIndices("aIndices")};
            }
          ${$.registerUniforms(w).declareVariables(...P,U)}
          ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${U.offsetToIndices("global_idx")};
              let batch = ${B("coords",0,x.rank)};
              let d2 = ${s?B("coords",x.rank-1,x.rank):B("coords",1,x.rank)};
              let xFRCCorner = vec3<u32>(${s?B("coords",1,x.rank):B("coords",2,x.rank)},
              ${s?B("coords",2,x.rank):B("coords",3,x.rank)},
              ${s?B("coords",3,x.rank):B("coords",4,x.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?B("uniforms.x_shape",1,x.rank):B("uniforms.x_shape",2,x.rank)};
              let xShapeZ = ${s?B("uniforms.x_shape",2,x.rank):B("uniforms.x_shape",3,x.rank)};
              let xShapeW = ${s?B("uniforms.x_shape",3,x.rank):B("uniforms.x_shape",4,x.rank)};
              let xShapeU = ${s?B("uniforms.x_shape",4,x.rank):B("uniforms.x_shape",1,x.rank)};
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
              ${ie}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${d};${m}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:f}),getShaderSource:y}}}),Su,Tu,Vc=T(()=>{Se(),_e(),ge(),ti(),Su=(e,t,r,i)=>{let a=e.length>2,n=a?"value += b[output_channel];":"",s=e[0].dims,o=e[1].dims,u=t.format==="NHWC",l=u?r[3]:r[1],d=l/t.group,p=u&&d>=4?R(l):1,f=D.size(r)/p,h=[{type:12,data:f},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:d}];Jr(t,h),h.push(...k(s,[o[0],o[1],o[2],o[3]/p]));let m=a?["rank","rank","rank"]:["rank","rank"];h.push(...k([r[0],r[1],r[2],r[3]/p]));let y=$=>{let w=X("output",e[0].dataType,r.length,p),_=O(w.type.tensor),S=Yr(t,w.type.value,_),x=A("x",e[0].dataType,s.length),z=A("w",e[1].dataType,o.length,p),P=[x,z];a&&P.push(A("b",e[2].dataType,e[2].dims,p));let U=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];ei(t,U);let q=u?`
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
  ${$.registerUniforms(U).declareVariables(...P,w)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${w.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${u?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${u?1:2}], outputIndices[${u?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${p} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${u?2:1}];

    var value: ${w.type.value} = ${w.type.value}(0);
    ${q}
    ${n}
    ${S}
    ${w.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:h}),getShaderSource:y}},Tu=(e,t,r,i)=>{let a=e.length>2,n=R(r[3]),s=R(r[2]),o=D.size(r)/n/s,u=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/n],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/n],d=[r[0],r[1],r[2],r[3]/n],p=[{type:12,data:o},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Jr(t,p),p.push(...k(u,l,d));let f=(s-1)*t.strides[1]+l[1],h=m=>{let y=X("output",e[0].dataType,d.length,n),$=O(y.type.tensor),w=Yr(t,y.type.value,$),_=A("x",e[0].dataType,u.length,n),S=A("w",e[1].dataType,l.length,n),x=[_,S];a&&x.push(A("b",e[2].dataType,e[2].dims,n));let z=a?"value += b[output_channel];":"",P=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return ei(t,P),`
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
          let w_val = ${S.get("w_height","w_width","0","output_channel")};
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
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${n};${s};${f};${l[0]};${l[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:p}),getShaderSource:h}}}),Eu,Na,Iu,La,En,In,ku,Cu,kn,Fc=T(()=>{_e(),Lc(),qc(),xn(),Vc(),ti(),wn(),gt(),Eu=(e,t,r,i,a,n)=>{let s=e[0],o=e.slice(n?1:2,n?3:4),u=o.length,l=t[0],d=t.slice(2).map((f,h)=>f+(f-1)*(r[h]-1)),p=o.map((f,h)=>f+i[h]+i[h+u]).map((f,h)=>Math.floor((f-d[h]+a[h])/a[h]));return p.splice(0,0,s),p.splice(n?3:1,0,l),p},Na=[2,3,1,0],Iu=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[1]*t.group;if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},La=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let n=2;n<t[1].dims.length;++n)r[n-2]===0&&(r[n-2]=t[1].dims[n]);let i=e.pads.slice();mr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,i,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:i}),a},En=e=>{let t=gn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,n=e.group,s=e.kernel_shape,o=e.pads,u=e.strides,l=e.w_is_const();return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},In=(e,t,r,i)=>{let a=r.format==="NHWC",n=Eu(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let P=[t[0]];if(a){let U=e.kernelCustomData.wT??e.compute(bt(t[1],Na),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=U),P.push(U)}else P.push(t[1]);t.length===3&&P.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(Tu(P,r,n,i),{inputs:P}):e.compute(Su(P,r,n,i),{inputs:P});return}let s=t.length===3,o=t[0].dims[a?1:2],u=t[0].dims[a?2:3],l=t[0].dims[a?3:1],d=t[1].dims[2],p=t[1].dims[3],f=n[a?1:2],h=n[a?2:3],m=n[a?3:1],y=a&&d===o&&p===u&&r.pads[0]===0&&r.pads[1]===0;if(y||d===1&&p===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let P=n[0],U,q,G,ie=[];if(a){let $e=e.kernelCustomData.wT??e.compute(bt(t[1],Na),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=$e),y){let Fe=o*u*l;U=t[0].reshape([1,P,Fe]),q=$e.reshape([1,Fe,m]),G=[1,P,m]}else U=t[0].reshape([P,o*u,l]),q=$e.reshape([1,l,m]),G=[P,f*h,m];ie.push(U),ie.push(q)}else U=t[0].reshape([P,l,o*u]),q=t[1].reshape([1,m,l]),G=[P,m,f*h],ie.push(q),ie.push(U);s&&ie.push(t[2]);let xe=G[2],he=ie[0].dims[ie[0].dims.length-1];xe<8&&he<8?e.compute(_n(ie,r,n,G,a,i),{inputs:ie}):e.compute(Ua(ie,r,n,G,a,i),{inputs:ie});return}let $=!0,w=e.kernelCustomData.wT??e.compute(bt(t[1],Na),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=w);let _=[t[0],w];s&&_.push(t[2]);let S=a?f*h:m,x=a?m:f*h,z=d*p*l;e.compute(_u(_,r,n,S,x,z,s,$,i),{inputs:_})},ku=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],n=[1].concat(t.strides),s=[1].concat(t.dilations),o=[1].concat(t.kernelShape),u=La({...t,pads:a,strides:n,dilations:s,kernelShape:o},i);In(e,i,u,l=>r?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},Cu=(e,t,r)=>{let i=r.format==="NHWC"?"channelsLast":"channelsFirst",a=La(r,t),n=r.autoPad==="NOTSET"?r.pads:r.autoPad,s=vu(t[0].dims,t[1].dims,r.strides,r.dilations,n,!1,i);e.compute(xu(t,a,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],i))},kn=(e,t)=>{if(Iu(e.inputs,t),e.inputs[0].dims.length===3)ku(e,t);else if(e.inputs[0].dims.length===5)Cu(e,e.inputs,t);else{let r=La(t,e.inputs);In(e,e.inputs,r)}}}),zu,Wc=T(()=>{Se(),Mt(),_e(),ge(),zu=(e,t,r)=>{let i=e.length>2,a=t.outputShape,n=t.format==="NHWC",s=t.group,o=e[1].dims,u=o[2]/s,l=o[3],d=n?R(u):1,p=n&&l===1&&u>=4,f=p?Math.floor(u/4)*4:Math.floor(u/d)*d,h=u-f,m=n?R(l):1,y=n?l===1?d:m:1,$=D.size(a)/m,w=[Math.ceil($/64),1,1];De("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${w}`);let _=["rank","rank"],S=[t.strides[0],t.strides[1]],x=[t.kernelShape[n?1:2],t.kernelShape[n?2:3]],z=[t.dilations[0],t.dilations[1]],P=[x[0]+(t.dilations[0]<=1?0:(t.kernelShape[n?1:2]-1)*(t.dilations[0]-1)),x[1]+(t.dilations[1]<=1?0:(t.kernelShape[n?2:3]-1)*(t.dilations[1]-1))],U=[P[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),P[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],q=[{type:12,data:$},{type:12,data:S},{type:12,data:x},{type:12,data:z},{type:12,data:P},{type:6,data:U},{type:12,data:f},{type:12,data:u},{type:12,data:l},...k(e[0].dims,e[1].dims)];i&&(q.push(...k(e[2].dims)),_.push("rank")),q.push(...k(a));let G=ie=>{let xe=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:S.length},{name:"filter_dims",type:"u32",length:x.length},{name:"dilations",type:"u32",length:x.length},{name:"effective_filter_dims",type:"u32",length:P.length},{name:"pads",type:"i32",length:U.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],he=O(e[0].dataType),$e=n?1:2,Fe=n?2:3,Oe=n?3:1,we=A("W",e[1].dataType,e[1].dims.length,y),Re=A("Dy",e[0].dataType,e[0].dims.length,d),ye=[Re,we];i&&ye.push(A("bias",e[2].dataType,[a[Oe]].length,m));let Ee=X("result",e[0].dataType,a.length,m),wt=()=>{let be="";if(p)d===4?be+=`
        let xValue = ${Re.getByOffset("x_offset")};
        let wValue = ${we.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:d===2?be+=`
          dotProd = dotProd + dot(vec4<${he}>(${Re.getByOffset("x_offset")}, ${Re.getByOffset("x_offset + 1u")}), vec4<${he}>(${we.getByOffset("w_offset")}, ${we.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:d===1&&(be+=`
          dotProd = dotProd + dot(vec4<${he}>(${Re.getByOffset("x_offset")}, ${Re.getByOffset("x_offset + 1u")}, ${Re.getByOffset("x_offset + 2u")}, ${Re.getByOffset("x_offset + 3u")}), vec4<${he}>(${we.getByOffset("w_offset")}, ${we.getByOffset("w_offset + 1u")}, ${we.getByOffset("w_offset + 2u")}, ${we.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(be+=`
                  let xValue = ${n?Re.getByOffset(`${Re.indicesToOffset(`${Re.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d}`):Re.get("batch","inputChannel","idyR","idyC")};
        `,d===1)be+=`
          let w_offset = ${we.indicesToOffset(`${we.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${we.getByOffset(`w_offset / ${y}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let Be=0;Be<d;Be++)be+=`
            let wValue${Be} = ${we.getByOffset(`${we.indicesToOffset(`${we.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${Be}, wOutChannel)`)} / ${y}`)};
            dotProd = dotProd + xValue[${Be}] * wValue${Be};`;return be},F=()=>{if(h===0)return"";if(!p)throw new Error(`packInputAs4 ${p} is not true.`);let be="";if(d===1){be+="dotProd = dotProd";for(let Be=0;Be<h;Be++)be+=`
            + ${Re.getByOffset(`x_offset + ${Be}`)} * ${we.getByOffset(`w_offset + ${Be}`)}`;be+=";"}else if(d===2){if(h!==2)throw new Error(`Invalid inputChannelsRemainder ${h}.`);be+=`
          let xValue = ${Re.getByOffset("x_offset")};
          let wValue = ${we.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return be},ae=`
            let outputIndices = ${Ee.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${Ee.indicesGet("outputIndices",0)};
            let d1 = ${Ee.indicesGet("outputIndices",Oe)};
            let r = ${Ee.indicesGet("outputIndices",$e)};
            let c = ${Ee.indicesGet("outputIndices",Fe)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${Ee.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${he}(dyRCorner) + ${he}(wR)) / ${he}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${he}(uniforms.Dy_shape[${$e}]) || fract(dyR) > 0.0 ||
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
                let dyC = (${he}(dyCCorner) + ${he}(wC)) / ${he}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${he}(uniforms.Dy_shape[${Fe}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${p?`
                var x_offset = ${Re.indicesToOffset(`${Re.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d};
                var w_offset = ${we.indicesToOffset(`${we.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${y};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${p?4:d}) {
                  ${wt()}
                  inputChannel = inputChannel + ${p?4:d};
                }
                ${F()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${i?` + bias[d1 / ${m}]`:""};
            ${Ee.setByOffset("global_idx","value")};
          `;return`
    ${ie.registerUniforms(xe).declareVariables(...ye,Ee)}
      ${ie.mainStart()}
      ${ie.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${ae}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${d}${y}${m}${p}${h}`,inputDependencies:_},getRunData:()=>({dispatchGroup:{x:w[0],y:w[1],z:w[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:q}),getShaderSource:G}}}),Au,Ou,Ru,Cn,Mu,Bu,zn,Du,Pu,Gc=T(()=>{Wc(),ti(),gt(),Au=(e,t,r,i,a,n)=>(e-1)*t+r+(i-1)*a+1-n,Ou=(e,t,r,i,a)=>{let n=Math.floor(e/2);t==="SAME_UPPER"?(r[i]=n,r[a]=e-n):t==="SAME_LOWER"&&(r[i]=e-n,r[a]=n)},Ru=(e,t,r,i,a,n,s,o,u,l)=>{let d=e.length-2,p=l.length===0;u.length<d&&u.push(...Array(d-u.length).fill(0));let f=e[0],h=t[o?3:1]*a;for(let m=0,y=e.length-d-(o?1:0);m<d;++m,++y){let $=e[y],w=p?$*s[m]:l[m],_=Au($,s[m],n[m],t[y],r[m],w);Ou(_,i,n,m,m+d),p&&l.push(s[m]*($-1)+u[m]+(t[y]-1)*r[m]+1-n[m]-n[m+d])}l.splice(0,0,f),l.splice(o?3:1,0,h)},Cn=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((p,f)=>p*f,1)===0){r.length=0;for(let p=2;p<t[1].dims.length;++p)r.push(t[1].dims[p])}let i=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(i?3:1,0,t[1].dims[1]);let a=e.pads.slice(),n=e.outputShape.slice(),s=e.outputPadding.slice(),o=t[0].dims,u=e.dilations.slice();if(u.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;u=new Array(p).fill(1)}let l=e.strides.slice();if(l.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;l=new Array(p).fill(1)}Ru(o,r,u,e.autoPad,e.group,a,l,i,s,n);let d=Object.assign({},e);return Object.assign(d,{kernelShape:r,pads:a,outputPadding:s,outputShape:n,dilations:u,strides:l}),d},Mu=e=>{let t=gn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,n=e.group,s=e.kernelShape,o=e.pads,u=e.strides,l=e.wIsConst(),d=e.outputPadding,p=e.outputShape;return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,outputPadding:d,outputShape:p,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Bu=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[0];if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let n=e[0].dims.length-2;if(t.dilations.reduce((s,o)=>s+o,0)>0&&t.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(t.strides.reduce((s,o)=>s+o,0)>0&&t.strides.length!==n)throw new Error(`strides should be ${n}D`);if(t.pads.reduce((s,o)=>s+o,0)>0&&t.pads.length!==n*2)throw new Error(`pads should be ${n*2}D`);if(t.outputPadding.length!==n&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${n}D`);if(t.kernelShape.reduce((s,o)=>s+o,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},zn=(e,t,r,i)=>{let a=e.kernelCustomData.wT??e.compute(bt(t[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=a);let n=[t[0],a];t.length===3&&n.push(t[2]),e.compute(zu(n,r,i),{inputs:n})},Du=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let n=t.dilations;(n.length===0||n[0]===0)&&(n=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let o=t.pads;o.length===0&&(o=[0,0]),o=[0,o[0],0,o[1]],s=[1].concat(s),n=[1].concat(n),a=[1].concat(a);let u=t.outputPadding;u=[0].concat(u);let l=Cn({...t,pads:o,strides:s,dilations:n,kernelShape:a,outputPadding:u},i);zn(e,i,l,d=>r?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Pu=(e,t)=>{if(Bu(e.inputs,t),e.inputs[0].dims.length===3)Du(e,t);else{let r=Cn(t,e.inputs);zn(e,e.inputs,r)}}}),Uu,Nu,Lu,jc=T(()=>{Se(),_e(),b(),ge(),Uu=(e,t,r,i)=>{let a=D.size(t),n=t.length,s=A("input",e,n),o=X("output",e,n),u=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),l=D.normalizeAxis(u,n),d=p=>{let f=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,h=B("uniforms.input_shape","uniforms.axis",n),m=i.reverse?f+(i.exclusive?" + 1":""):"0",y=i.reverse?h:f+(i.exclusive?"":" + 1");return`
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
                }`};return{name:"CumSum",shaderCache:{hint:i.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:l},...k(t,t)]}),getShaderSource:d}},Nu=(e,t)=>{let r=e.inputs[0].dims,i=e.inputs[0].dataType,a=e.inputs[1];e.compute(Uu(i,r,a,t),{inputs:[0]})},Lu=e=>{let t=e.exclusive===1,r=e.reverse===1;return g({exclusive:t,reverse:r})}}),qu,Vu,Fu,Wu,Gu,Hc=T(()=>{Se(),_e(),b(),ge(),qu=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},Vu=(e,t,r,i)=>{let a=[];a.push(`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let n=0;n<t;++n)a.push(r.indicesSet("a",e[n],`i[${n}]`));return a.push("return a;}"),a.join(`
`)},Fu=(e,t)=>{let r,i,a,n,s,o,u=t.format==="NHWC",l=t.blocksize,d=t.mode==="DCR";u?([r,i,a,n]=e.dims,s=d?[r,i,a,l,l,n/l**2]:[r,i,a,n/l**2,l,l],o=d?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,i,a,n]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=d?[r,l,l,n/l**2,i,a]:[r,n/l**2,l,l,i,a],o=d?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let p=e.reshape(s),f=p.dims.length,h=e.dataType,m=A("a",h,f),y=X("output",h,f),$=w=>`
  ${w.registerUniform("output_size","u32").declareVariables(m,y)}

  ${Vu(o,f,m,y)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${y.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${y.setByOffset("global_idx",m.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:w=>{let _=u?[r,i*l,a*l,n/l**2]:[r,n/l**2,i*l,a*l],S=D.size(_),x=p.dims,z=D.sortBasedOnPerm(x,o);return{outputs:[{dims:_,dataType:w[0].dataType}],dispatchGroup:{x:Math.ceil(S/64)},programUniforms:[{type:12,data:S},...k(x,z)]}},getShaderSource:$}},Wu=(e,t)=>{qu(e.inputs),e.compute(Fu(e.inputs[0],t))},Gu=e=>g({blocksize:e.blocksize,mode:e.mode,format:e.format})}),qa,ca,An,ju,Hu,Ku,Zu,On,Qu,Xu,Yu,Kc=T(()=>{Se(),_e(),b(),ge(),qa="[a-zA-Z]|\\.\\.\\.",ca="("+qa+")+",An="^"+ca+"$",ju="("+ca+",)*"+ca,Hu="^"+ju+"$",Ku=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},Zu=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,i]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(Hu)))throw new Error("Invalid LHS term");if(r.split(",").forEach((n,s)=>{let o=e[s].dims.slice();if(!n.match(RegExp(An)))throw new Error("Invalid LHS term");let u=this.processTerm(n,!0,o,s);this.lhs.push(u)}),i==="")i+=[...this.symbolToInfo.entries()].filter(([n,s])=>s.count===1||n==="...").map(([n])=>n).join("");else if(!i.match(RegExp(ca)))throw new Error("Invalid RHS");(a=i.match(RegExp(qa,"g")))==null||a.forEach(n=>{if(n==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let s=this.symbolToInfo.get(n);if(s===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(s.dimValue)}}),this.rhs=this.processTerm(i,!1,this.outputDims)}addSymbol(e,t,r){let i=this.symbolToInfo.get(e);if(i!==void 0){if(i.dimValue!==t&&i.count!==1)throw new Error("Dimension mismatch");i.count++,i.inputIndices.push(r)}else i={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,i)}processTerm(e,t,r,i=-1){let a=r.length,n=!1,s=[],o=0;if(!e.match(RegExp(An))&&!t&&e!=="")throw new Error("Invalid LHS term");let u=e.match(RegExp(qa,"g")),l=new Ku(i);return u==null||u.forEach((d,p)=>{if(d==="..."){if(n)throw new Error("Only one ellipsis is allowed per input term");n=!0;let f=a-u.length+1;if(f<0)throw new Error("Ellipsis out of bounds");if(s=r.slice(o,o+f),this.hasEllipsis){if(this.ellipsisDims.length!==s.length||this.ellipsisDims.toString()!==s.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=s;else throw new Error("Ellipsis must be specified in the LHS");for(let h=0;h<s.length;h++){let m=String.fromCharCode(48+h);l.addSymbol(m,p+h),this.addSymbol(m,r[o++],i)}}else l.addSymbol(d,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(d,r[o++],i)}),l}},On=e=>e+"_max",Qu=(e,t,r,i)=>{let a=e.map(l=>l.length).map((l,d)=>A(`input${d}`,t,l)),n=D.size(i),s=X("output",t,i.length),o=[...r.symbolToInfo.keys()].filter(l=>!r.rhs.symbolToIndices.has(l)),u=l=>{let d=[],p="var prod = 1.0;",f="var sum = 0.0;",h="sum += prod;",m=[],y=[],$=[],w=[],_=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((x,z)=>{var P;if(r.rhs.symbolToIndices.has(z)){let U=(P=r.rhs.symbolToIndices.get(z))==null?void 0:P[0];U!==void 0&&r.lhs.forEach((q,G)=>{if(x.inputIndices.includes(G)){let ie=q.symbolToIndices.get(z);if(ie===void 0)throw new Error("Invalid symbol error");ie.forEach(xe=>{d.push(`${a[G].indicesSet(`input${G}Indices`,xe,s.indicesGet("outputIndices",U))}`)})}})}else r.lhs.forEach((U,q)=>{if(x.inputIndices.includes(q)){let G=U.symbolToIndices.get(z);if(G===void 0)throw new Error("Invalid symbol error");G.forEach(ie=>{m.push(`${a[q].indicesSet(`input${q}Indices`,ie,`${z}`)}`)}),w.push(`prod *= ${a[q].getByIndices(`input${q}Indices`)};`)}}),y.push(`for(var ${z}: u32 = 0; ${z} < uniforms.${On(z)}; ${z}++) {`),$.push("}")});let S=_?[...d,`let sum = ${a.map((x,z)=>x.getByIndices(`input${z}Indices`)).join(" * ")};`]:[...d,f,...y,...m,p,...w,h,...$];return`
            ${l.registerUniforms(o.map(x=>({name:`${On(x)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,s)}

            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${s.offsetToIndices("global_idx")};
            ${a.map((x,z)=>`var input${z}Indices: ${a[z].type.indices};`).join(`
`)}
            ${S.join(`
`)};
            ${s.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let l=o.filter(p=>r.symbolToInfo.has(p)).map(p=>{var f;return{type:12,data:((f=r.symbolToInfo.get(p))==null?void 0:f.dimValue)||0}});l.push({type:12,data:n});let d=e.map((p,f)=>[...k(p)]).reduce((p,f)=>p.concat(f),l);return d.push(...k(i)),{outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:d}},getShaderSource:u}},Xu=(e,t)=>{let r=new Zu(e.inputs,t.equation),i=r.outputDims,a=e.inputs.map((n,s)=>n.dims);e.compute(Qu(a,e.inputs[0].dataType,r,i))},Yu=e=>{let t=e.equation.replace(/\s+/g,"");return g({equation:t})}}),Ju,Rn,el,tl,rl,Zc=T(()=>{Se(),_e(),ge(),Ju=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;i<r.length&&a<t.length;++i,++a)if(r[i]!==t[a]&&r[i]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Rn=(e,t)=>{let r=e.length-t.length,i=[];for(let a=0;a<r;++a)i.push(e[a]);for(let a=0;a<t.length;++a)i.push(t[a]===1?e[a+r]:t[a]);return i},el=(e,t)=>e.length>t.length?Rn(e,t):Rn(t,e),tl=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=el(t,r),a=e[0].dataType,n=a===9||D.size(t)===1,s=a===9||t.length>0&&t[t.length-1]%4===0?4:1,o=n||i.length>0&&i[i.length-1]%4===0?4:1,u=Math.ceil(D.size(i)/o),l=p=>{let f=A("input",a,t.length,s),h=X("output",a,i.length,o),m;if(a===9){let y=($,w,_="")=>`
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
    ${m}`},d=[{type:12,data:u},...k(t,i)];return{name:"Expand",shaderCache:{hint:`${i.length};${s}${o}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d})}},rl=e=>{Ju(e.inputs),e.compute(tl(e.inputs),{inputs:[0]})}}),il,al,Qc=T(()=>{Se(),_e(),ge(),mn(),il=e=>{let t=e[0].dataType,r=D.size(e[0].dims),i=D.size(e[1].dims),a=i%4===0,n=s=>{let o=A("x",t,[1],4),u=A("bias",t,[1],4),l=X("y",t,[1],4),d=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],p=h=>`
      let bias${h}_offset: u32 = (global_idx * 4 + ${h}) % uniforms.bias_size;
      let bias${h} = ${u.getByOffset(`bias${h}_offset / 4`)}[bias${h}_offset % 4];`,f=a?`
      let bias = ${u.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${p(0)}${p(1)}${p(2)}${p(3)}
      let bias = ${o.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(d).declareVariables(o,u,l)}

    ${fn(C(t))}

    ${s.mainStart(E)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${o.getByOffset("global_idx")};
      ${f}
      let x_in = x + bias;
      ${l.setByOffset("global_idx",hn("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:n,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:i}],dispatchGroup:{x:Math.ceil(r/E/4)}})}},al=e=>{e.inputs.length<2||D.size(e.inputs[1].dims)===0?Uo(e):e.compute(il(e.inputs))}}),nl,sl,ol,ul,Xc=T(()=>{Se(),_e(),b(),ge(),nl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},sl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=D.normalizeAxis(t.axis,a),s=r.slice(0);s.splice(n,1,...i);let o=r[n],u=e[0].dataType===9?4:1,l=Math.ceil(D.size(s)/u),d=[{type:12,data:l},{type:6,data:o},{type:12,data:n},...k(e[0].dims,e[1].dims,s)],p=f=>{let h=A("data",e[0].dataType,e[0].dims.length,u),m=A("inputIndices",e[1].dataType,e[1].dims.length),y=X("output",e[0].dataType,s.length,u),$=_=>{let S=i.length,x=`var indicesIndices${_}  = ${m.type.indices}(0);`;for(let z=0;z<S;z++)x+=`${S>1?`indicesIndices${_}[${z}]`:`indicesIndices${_}`} = ${s.length>1?`outputIndices${_}[uniforms.axis + ${z}]`:`outputIndices${_}`};`;x+=`
          var idx${_} = ${m.getByIndices(`indicesIndices${_}`)};
          if (idx${_} < 0) {
            idx${_} = idx${_} + uniforms.axisDimLimit;
          }
          var dataIndices${_} : ${h.type.indices};
        `;for(let z=0,P=0;z<a;z++)z===n?(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = u32(idx${_});`,P+=S):(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = ${s.length>1?`outputIndices${_}[${P}]`:`outputIndices${_}`};`,P++);return x},w;if(e[0].dataType===9){let _=(S,x,z="")=>`
          let outputIndices${x} = ${y.offsetToIndices(`outputOffset + ${x}u`)};
          ${$(x)};
          let offset${x} = ${h.indicesToOffset(`dataIndices${x}`)};
          let index${x} = offset${x} / 4u;
          let component${x} = offset${x} % 4u;
          ${S}[${x}] = ${z}(${h.getByOffset(`index${x}`)}[component${x}]);
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
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:p}},ol=e=>g({axis:e.axis}),ul=(e,t)=>{let r=e.inputs;nl(r),e.compute(sl(e.inputs,t))}}),ll,dl,pl,Yc=T(()=>{Se(),_e(),ge(),ll=(e,t,r,i,a,n,s,o,u)=>{let l=[{type:12,data:n},{type:12,data:i},{type:12,data:a},{type:12,data:r},{type:12,data:s},{type:12,data:o},{type:12,data:u}],d=[n];l.push(...k(t.dims,d));let p=f=>{let h=A("indices_data",t.dataType,t.dims.length),m=X("input_slice_offsets_data",12,1,1),y=[h,m],$=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:a.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
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
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${a.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:l}),getShaderSource:p},{inputs:[t],outputs:[-1]})[0]},dl=(e,t)=>{let r=e.inputs,i=r[0].dims,a=r[0].dataType,n=r[1].dims,s=n[n.length-1],o=D.sizeToDimension(n,n.length-1),u=D.sizeFromDimension(i,t.batchDims+s),l=D.sizeToDimension(i,t.batchDims),d=D.sizeFromDimension(i,t.batchDims),p=o/l,f=new Array(s),h=u;for(let x=0;x<s;++x)f[s-1-x]=h,h*=i[t.batchDims+s-1-x];let m=ll(e,r[1],f,t.batchDims,i,o,p,d,s),y=t.batchDims+s;if(y>i.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let $=n.slice(0,-1).concat(i.slice(y)),w=D.size($),_=[{type:12,data:w},{type:12,data:u},...k(r[0].dims,m.dims,$)],S=x=>{let z=A("data",r[0].dataType,r[0].dims.length),P=A("slice_offsets",12,m.dims.length),U=X("output",r[0].dataType,$.length);return`
          ${x.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(z,P,U)}
            ${x.mainStart()}
            ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:$,dataType:a}],dispatchGroup:{x:Math.ceil(w/64)},programUniforms:_}),getShaderSource:S},{inputs:[r[0],m]})},pl=e=>({batchDims:e.batch_dims,cacheKey:""})}),cl,fl,hl,ml,Jc=T(()=>{Se(),_e(),b(),ge(),cl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=D.normalizeAxis(t.quantizeAxis,e[0].dims.length),i=t.blockSize,a=e[0],n=e[2],s=e.length===4?e[3]:void 0;if(n.dims.length!==a.dims.length||!a.dims.map((o,u)=>u===r?Math.ceil(o/i)===n.dims[u]:o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==n.dims.length||!s.dims.map((o,u)=>o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},fl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=D.normalizeAxis(t.gatherAxis,a),s=D.normalizeAxis(t.quantizeAxis,a),o=r.slice(0);o.splice(n,1,...i);let u=D.size(o),l=e[2].dataType,d=e[0].dataType===22,p=[{type:12,data:u},{type:12,data:s},{type:12,data:n},{type:12,data:t.blockSize},...k(...e.map((h,m)=>h.dims),o)],f=h=>{let m=A("data",e[0].dataType,e[0].dims.length),y=A("inputIndices",e[1].dataType,e[1].dims.length),$=A("scales",e[2].dataType,e[2].dims.length),w=e.length>3?A("zeroPoint",e[3].dataType,e[3].dims.length):void 0,_=X("output",l,o.length),S=[m,y,$];w&&S.push(w);let x=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${h.registerUniforms(x).declareVariables(...S,_)}
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
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((h,m)=>m!==1).map(h=>h.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(h,m)=>"rank")},getRunData:()=>({outputs:[{dims:o,dataType:l}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:f}},hl=(e,t)=>{let r=e.inputs;cl(r,t),e.compute(fl(e.inputs,t))},ml=e=>g({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),gl,yl,_l,wl,ef=T(()=>{Se(),_e(),b(),ge(),gl=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},yl=(e,t)=>{let r=e[0].dims,i=e[0].dataType,a=r.length,n=e[1].dims,s=e[1].dataType,o=D.normalizeAxis(t.axis,a),u=r[o],l=n.slice(0),d=D.size(l),p=A("input",i,a),f=A("indicesInput",s,n.length),h=X("output",i,l.length),m=[{type:12,data:d},{type:6,data:u},{type:12,data:o}];return m.push(...k(r,n,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:m}),getShaderSource:y=>`
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
  }`}},_l=e=>g({axis:e.axis}),wl=(e,t)=>{let r=e.inputs;gl(r),e.compute(yl(e.inputs,t))}}),bl,$l,vl,xl,tf=T(()=>{Se(),_e(),ge(),bl=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},$l=(e,t)=>{let r=e[0].dims.slice(),i=e[1].dims.slice(),[a,n,s]=gi.getShapeOfGemmResult(r,t.transA,i,t.transB,e.length===3?e[2].dims:void 0),o=[a,n];if(!o)throw new Error("Can't use gemm on the given tensors");let u=16,l=Math.ceil(n/u),d=Math.ceil(a/u);D.size(o);let p=[{type:12,data:l},{type:12,data:a},{type:12,data:n},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],f=["type","type"];e.length===3&&(p.push(...k(e[2].dims)),f.push("rank")),p.push(...k(o));let h=m=>{let y=A("a",e[0].dataType,e[0].dims),$=A("b",e[1].dataType,e[1].dims),w=null,_=[y,$];e.length===3&&(w=A("c",e[2].dataType,e[2].dims.length),_.push(w));let S=X("output",e[0].dataType,o.length);_.push(S);let x=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],z="",P="";t.transA&&t.transB?(P=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${$.type.value}(0);
      }
      `,z="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(P=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${$.type.value}(0);
      }
      `,z="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(P=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${$.type.value}(0);
      }
      `,z="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(P=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${$.type.value}(0);
      }
      `,z="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let U=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${m.registerUniforms(x).declareVariables(..._)}
  var<workgroup> tile_a: array<array<${y.type.storage}, ${u}>, ${u}>;
  var<workgroup> tile_b: array<array<${$.type.storage}, ${u}>, ${u}>;
  ${m.mainStart([u,u,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${u};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${u};
    let num_tiles = (uniforms.K - 1) / ${u} + 1;
    var k_start = 0u;
    var value = ${S.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${P}
      k_start = k_start + ${u};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${u}; k++) {
        ${z}
      }
      workgroupBarrier();
    }

    ${U}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${w!=null?`let cOffset = ${w.broadcastedIndicesToOffset("vec2(m, n)",S)}; value += ${S.type.value}(uniforms.beta) * ${w.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:l*d},programUniforms:p}),getShaderSource:h}},vl=e=>{let t=e.transA,r=e.transB,i=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:i,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},xl=(e,t)=>{bl(e.inputs),e.compute($l(e.inputs,t))}}),ir,dr,ri,ii,Sl,Tl,El,Il,kl,Cl,zl,Al,Ol,Rl,rf=T(()=>{Se(),_e(),b(),ge(),[ir,dr,ri,ii]=[0,1,2,3],Sl=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},Tl=`
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
`,El=e=>`
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
`,Il=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,kl=e=>`
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
`,Cl=(e,t,r)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${ir}] = batch;
     indices[${dr}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
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
`,zl=(e,t,r)=>(()=>{switch(r.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${ir}], indices[${dr}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${ir}], indices[${dr}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${ir}], indices[${dr}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${ir}], indices[${dr}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${ir}], indices[${dr}], border);

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
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${ir}], indices[${dr}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,Al=(e,t)=>{let r=A("x",e[0].dataType,e[0].dims.length),i=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],a=A("grid",e[1].dataType,i.length,2),n=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(n=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[ir,dr,ri,ii]=[0,3,1,2]);let s=X("output",e[0].dataType,n.length),o=r.type.value,u=D.size(n),l=[{type:12,data:u},...k(e[0].dims,i,n)],d=p=>`
  ${p.registerUniform("output_size","u32").declareVariables(r,a,s)}
  ${Tl}
  ${El(o)}
  ${Il(t)}
  ${kl(t)}
  ${Cl(r,o,t)}

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
      var grid_indices = vec3<u32>(indices[${ir}], indices[${ri}], indices[${ii}]);
      let nxy = ${a.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${zl(s,o,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:p=>{let f=D.size(n);return{outputs:[{dims:n,dataType:p[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:l}},getShaderSource:d}},Ol=(e,t)=>{Sl(e.inputs),e.compute(Al(e.inputs,t))},Rl=e=>g({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),St,Ml,Bl,Mn,Dl,fa,Pl,Ul=T(()=>{Se(),_e(),b(),bi(),pn(),ge(),gt(),St=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,Ml=(e,t)=>{let r=e[0],i=St(e,1),a=St(e,2),n=St(e,3),s=St(e,4),o=St(e,5),u=St(e,6),l=St(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let d=r.dims[0],p=r.dims[1],f=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],h=p,m=0,y=0,$=Math.floor(f/t.numHeads);if(u&&l&&D.size(u.dims)&&D.size(l.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==t.numHeads||u.dims[3]!==$)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==d||l.dims[1]!==t.numHeads||l.dims[3]!==$)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');m=u.dims[2],y=u.dims[2]}else if(u&&D.size(u.dims)||l&&D.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w;if(i&&D.size(i.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(i.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');w=2,h=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==$)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');w=5,h=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==$)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');w=0,h=i.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}if(n&&D.size(n.dims)>0){if(n.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(i&&i.dims.length===5&&i.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let _=m+h,S=0;if(s&&D.size(s.dims)>0){S=8;let U=s.dims;throw U.length===1?U[0]===d?S=1:U[0]===3*d+2&&(S=3):U.length===2&&U[0]===d&&U[1]===_&&(S=5),S===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let x=!1,z=f;if(a&&D.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(h!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');z=a.dims[2]}else{if(h!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');z=a.dims[1]*a.dims[3],x=!0}}let P=!1;if(s&&D.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(o&&D.size(o.dims)>0){if(o.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(o.dims[0]!==d||o.dims[1]!==t.numHeads||o.dims[2]!==p||o.dims[3]!==_)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:p,pastSequenceLength:m,kvSequenceLength:h,totalSequenceLength:_,maxSequenceLength:y,inputHiddenSize:0,hiddenSize:f,vHiddenSize:z,headSize:$,vHeadSize:Math.floor(z/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:S,scale:t.scale,broadcastResPosBias:P,passPastInKv:x,qkvFormat:w}},Bl=e=>g({...e}),Mn=g({perm:[0,2,1,3]}),Dl=(e,t,r,i,a,n,s)=>{let o=[i,a,n],u=D.size(o),l=[{type:12,data:u},{type:12,data:s},{type:12,data:n}],d=p=>{let f=X("qkv_with_bias",t.dataType,o),h=A("qkv",t.dataType,o),m=A("bias",r.dataType,o),y=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${p.registerUniforms(y).declareVariables(h,m,f)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l}),getShaderSource:d},{inputs:[t,r],outputs:[-1]})[0]},fa=(e,t,r,i,a,n,s,o)=>{let u=n;if(s&&D.size(s.dims)>0){if(i===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=Dl(e,n,s,t,i,r*a,o),u=u.reshape([t,i,r,a]),r===1||i===1?u:e.compute(bt(u,Mn.perm),{inputs:[u],outputs:[-1]})[0]}else return n.dims.length===3&&(u=n.reshape([t,i,r,a])),r===1||i===1?u:e.compute(bt(u,Mn.perm),{inputs:[u],outputs:[-1]})[0]},Pl=(e,t)=>{let r=Ml(e.inputs,t),i=e.inputs[0],a=St(e.inputs,1),n=St(e.inputs,2),s=St(e.inputs,3),o=St(e.inputs,4),u=St(e.inputs,5),l=St(e.inputs,6),d=St(e.inputs,7);if(i.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let p=a&&n&&a.dims.length===4&&n.dims.length===4,f=fa(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,i,s,0);if(p)return ua(e,f,a,n,o,void 0,l,d,u,r);if(!a||!n)throw new Error("key and value must be provided");let h=fa(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,s,r.hiddenSize),m=fa(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,n,s,2*r.hiddenSize);ua(e,f,h,m,o,void 0,l,d,u,r)}}),Nl,Ll,ql,Vl,Bn,Fl,Wl,Gl=T(()=>{Se(),_e(),b(),ge(),Nl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Ll=(e,t)=>{let r=[],i=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),i=r.length),g({numOutputs:i,axis:t.axis,splitSizes:r})},ql=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${B("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,Vl=e=>{let t=e.length,r=[];for(let i=0;i<t;++i){let a=e[i].setByIndices("indices","input[global_idx]");t===1?r.push(a):i===0?r.push(`if (output_number == ${i}u) { ${a} }`):i===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${i}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},Bn=(e,t)=>{let r=e[0].dims,i=D.size(r),a=e[0].dataType,n=D.normalizeAxis(t.axis,r.length),s=new Array(t.numOutputs),o=A("input",a,r.length),u=new Array(t.numOutputs),l=[],d=[],p=0,f=[{type:12,data:i}];for(let m=0;m<t.numOutputs;m++){p+=t.splitSizes[m],u[m]=p;let y=r.slice();y[n]=t.splitSizes[m],d.push(y),s[m]=X(`output${m}`,a,y.length),l.push({dims:d[m],dataType:e[0].dataType})}f.push({type:12,data:u},...k(r,...d));let h=m=>`
  ${m.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(o,...s)}
  ${ql(u.length)}
  ${Vl(s)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${o.offsetToIndices("global_idx")};
    var index = ${o.indicesGet("indices",n)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${B("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${o.indicesSet("indices",n,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:h,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(i/64)},programUniforms:f})}},Fl=(e,t)=>{Nl(e.inputs);let r=e.inputs.length===1?t:Ll(e.inputs,t);e.compute(Bn(e.inputs,r),{inputs:[0]})},Wl=e=>{let t=e.axis,r=e.splitSizes,i=e.numOutputs<0?r.length:e.numOutputs;if(i!==r.length)throw new Error("numOutputs and splitSizes lengh must be equal");return g({axis:t,numOutputs:i,splitSizes:r})}}),jl,Va,Hl,Kl=T(()=>{Se(),_e(),b(),ge(),jl=(e,t)=>{let[r,i,a,n]=e,{numHeads:s,rotaryEmbeddingDim:o}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!D.areEqual(i.dims,[])&&!D.areEqual(i.dims,[1])&&i.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(n.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${n.dims.length}`);if(!D.areEqual(a.dims,n.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(o>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=r.dims[0],l=r.dims[r.dims.length-2],d=a.dims[0],p=D.sizeFromDimension(r.dims,1)/l,f=o===0?a.dims[1]*2:p/s;if(o>f)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(i.dims.length===2){if(u!==i.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${i.dims[0]}`);if(l!==i.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${i.dims[1]}`)}if(f/2!==a.dims[1]&&o/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`);if(l>d)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Va=(e,t)=>{let{interleaved:r,numHeads:i,rotaryEmbeddingDim:a,scale:n}=t,s=e[0].dims[0],o=D.sizeFromDimension(e[0].dims,1),u=e[0].dims[e[0].dims.length-2],l=o/u,d=e[2].dims[1],p=a===0?d*2:l/i,f=new Array(s,u,l/p,p-d),h=D.computeStrides(f),m=[{type:1,data:n},{type:12,data:f},{type:12,data:h},...e[0].dims.length===3?new Array({type:12,data:[o,l,p,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[o,p,u*p,1]}):[],...k(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],y=$=>{let w=A("input",e[0].dataType,e[0].dims.length),_=A("position_ids",e[1].dataType,e[1].dims.length),S=A("cos_cache",e[2].dataType,e[2].dims.length),x=A("sin_cache",e[3].dataType,e[3].dims.length),z=X("output",e[0].dataType,e[0].dims.length);return $.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:f.length},{name:"global_strides",type:"u32",length:h.length},{name:"input_output_strides",type:"u32",length:h.length}]),`
        ${$.declareVariables(w,_,S,x,z)}

        ${$.mainStart(E)}
          let half_rotary_emb_dim = uniforms.${S.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${_.broadcastedIndicesToOffset("bsnh.xy",X("",_.type.tensor,2))};
            let position_id =
                u32(${_.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${w.getByOffset("i")} * ${S.get("position_id","bsnh[3]")} -
                ${w.getByOffset("j")} * ${x.get("position_id","bsnh[3]")};
            ${z.setByOffset("i","re")}
            let im = ${w.getByOffset("i")} * ${x.get("position_id","bsnh[3]")} +
                ${w.getByOffset("j")} * ${S.get("position_id","bsnh[3]")};
            ${z.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${z.setByOffset("k",w.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:g({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:y,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(D.size(f)/E)},programUniforms:m})}},Hl=(e,t)=>{jl(e.inputs,t),e.compute(Va(e.inputs,t))}}),Zl,Ql,Dn,Xl,Yl,af=T(()=>{b(),Se(),pn(),Ul(),Gl(),gt(),Kl(),ge(),Zl=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let o=r.dims[0],u=r.dims[1],l=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],d=u,p=0,f=!i||i.dims.length===0,h=Math.floor(f?l/(t.numHeads+2*t.kvNumHeads):l/t.numHeads);f&&(l=h*t.numHeads);let m=n&&n.dims.length!==0,y=s&&s.dims.length!==0;if(m&&n.dims.length===4&&n.dims[0]===o&&n.dims[1]!==t.kvNumHeads&&n.dims[2]===t.kvNumHeads&&n.dims[3]===h)throw new Error("BSNH pastKey/pastValue is not supported");if(m&&y){if(n.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');p=n.dims[2]}else if(m||y)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let $=1;if(i&&i.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(r.dims[2]%i.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');d=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==h)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');d=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==h)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');d=i.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');$=3}let w=0,_=!1,S=t.kvNumHeads?h*t.kvNumHeads:l;if(a&&a.dims.length>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(d!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');S=a.dims[2]}else{if(d!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');S=a.dims[1]*a.dims[3],_=!0}}let x=e.length>4?e[5]:void 0;if(x&&x.dims.length!==1&&x.dims[0]!==o)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:o,sequenceLength:u,pastSequenceLength:p,kvSequenceLength:d,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:l,vHiddenSize:S,headSize:h,vHeadSize:Math.floor(S/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:w,scale:t.scale,broadcastResPosBias:!1,passPastInKv:_,qkvFormat:$}},Ql=g({perm:[0,2,1,3]}),Dn=(e,t,r)=>{let i=t,a=r.kvNumHeads;return t.dims.length===3&&r.kvSequenceLength!==0&&(i=t.reshape([r.batchSize,r.kvSequenceLength,a,r.headSize]),i=e.compute(bt(i,Ql.perm),{inputs:[i],outputs:[-1]})[0]),i},Xl=(e,t,r,i)=>{let a=7,n=["type","type"],s=[e*t],o=e*t,u=[{type:12,data:o},{type:12,data:t},{type:12,data:e}],l=d=>{let p=A("seq_lens",r.dataType,r.dims),f=A("total_seq_lens",i.dataType,i.dims),h=X("pos_ids",a,s),m=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
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
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:n},getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:u}),getShaderSource:l}},Yl=(e,t)=>{var x;let r=Zl(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((x=e.inputs[1])==null?void 0:x.dims.length)===5)throw new Error("Packed KV is not implemented");let i=e.inputs[0],a=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,n=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,s=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,o=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,u=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,d=r.kvNumHeads?r.kvNumHeads:r.numHeads,p=g({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,d*r.headSize,d*r.headSize]}),[f,h,m]=!a&&!n?e.compute(Bn([i],p),{inputs:[i],outputs:[-1,-1,-1]}):[i,a,n],y,$;if(t.doRotary){let z=e.compute(Xl(r.batchSize,r.sequenceLength,u,l),{inputs:[u,l],outputs:[-1]})[0],P=e.inputs[7],U=e.inputs[8],q=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),G=[f,z,P,U],ie=[-1];y=e.compute(Va(G,q),{inputs:G,outputs:ie})[0],G.splice(0,1,h);let xe=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});$=e.compute(Va(G,xe),{inputs:G,outputs:ie})[0]}let w=fa(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,t.doRotary?y:f,void 0,0),_=Dn(e,t.doRotary?$:h,r),S=Dn(e,m,r);ua(e,w,_,S,void 0,void 0,s,o,void 0,r,u,l)}}),Pn,Jl,ed,td,nf=T(()=>{Se(),_e(),gt(),ge(),Pn=(e,t,r,i,a,n,s,o)=>{let u=R(n),l=u===1?"f32":`vec${u}f`,d=u===1?"vec2f":`mat2x${u}f`,p=a*s,f=64;p===1&&(f=256);let h=[a,s,n/u],m=[a,s,2],y=["rank","type","type"],$=[];$.push(...k(h,m));let w=_=>{let S=A("x",t.dataType,3,u),x=A("scale",r.dataType,r.dims),z=A("bias",i.dataType,i.dims),P=X("output",1,3,2),U=[S,x,z,P];return`
  var<workgroup> workgroup_shared : array<${d}, ${f}>;
  const workgroup_size = ${f}u;
  ${_.declareVariables(...U)}
  ${_.mainStart(f)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${S.get("batch","channel","h")});
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
      let sum_final = ${j("workgroup_shared[0][0]",u)} / f32(hight * ${u});
      let squared_sum_final = ${j("workgroup_shared[0][1]",u)} / f32(hight * ${u});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${o}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${o};${f}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:m,dataType:1}],dispatchGroup:{x:p},programUniforms:$}),getShaderSource:w},{inputs:[t,r,i],outputs:[-1]})[0]},Jl=(e,t,r)=>{let i=t[0].dims,a=i,n=2,s=i[0],o=i[1],u=D.sizeFromDimension(i,n),l=R(u),d=D.size(a)/l,p=Pn(e,t[0],t[1],t[2],s,u,o,r.epsilon),f=[s,o,u/l],h=[s,o],m=["type","none"],y=$=>{let w=A("x",t[0].dataType,f.length,l),_=A("scale_shift",1,h.length,2),S=X("output",t[0].dataType,f.length,l),x=[w,_,S];return`
  ${$.registerUniform("output_size","u32").declareVariables(...x)}
  ${$.mainStart()}
  ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${S.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${_.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${w.getByOffset("global_idx")} * ${S.type.value}(scale_shift.x) + ${S.type.value}(scale_shift.y);
      ${S.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:[{type:12,data:d},...k(f,h,f)]}),getShaderSource:y},{inputs:[t[0],p]})},ed=(e,t,r)=>{let i=t[0].dims,a=i,n=i[0],s=i[i.length-1],o=D.sizeFromDimension(i,1)/s,u=R(s),l=D.size(a)/u,d=[{type:12,data:o},{type:12,data:Math.floor(s/u)}],p=["type","type"],f=!1,h=[0,i.length-1];for(let w=0;w<i.length-2;w++)f=f||i[w+1]!==1,h.push(w+1);f=f&&i[i.length-1]!==1;let m=f?e.compute(bt(e.inputs[0],h),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:i.length},(w,_)=>i[h[_]])),y=Pn(e,m,t[1],t[2],n,o,s,r.epsilon),$=w=>{let _=O(t[0].dataType),S=u===1?"vec2f":`mat${u}x2f`,x=U=>{let q=U===0?"x":"y",G=u===1?"f32":`vec${u}f`;switch(u){case 1:return`${_}(${G}(scale.${q}))`;case 2:return`vec2<${_}>(${G}(scale[0].${q}, scale[1].${q}))`;case 4:return`vec4<${_}>(${G}(scale[0].${q}, scale[1].${q}, scale[2].${q}, scale[3].${q}))`;default:throw new Error(`Not supported compoents ${u}`)}},z=A("input",t[0].dataType,t[0].dims,u),P=X("output",t[0].dataType,a,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${z.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${S}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${P.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${w.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${x(0)}, ${x(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:$},{inputs:[t[0],y]})},td=(e,t)=>{t.format==="NHWC"?ed(e,e.inputs,t):Jl(e,e.inputs,t)}}),rd,id,ad,sf=T(()=>{Se(),_e(),ge(),rd=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},id=(e,t,r)=>{let i=t.simplified,a=e[0].dims,n=e[1],s=!i&&e[2],o=a,u=D.normalizeAxis(t.axis,a.length),l=D.sizeToDimension(a,u),d=D.sizeFromDimension(a,u),p=D.size(n.dims),f=s?D.size(s.dims):0;if(p!==d||s&&f!==d)throw new Error(`Size of X.shape()[axis:] == ${d}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${p} and bias size of ${f}`);let h=[];for(let z=0;z<a.length;++z)z<u?h.push(a[z]):h.push(1);let m=R(d),y=["type","type"],$=[{type:12,data:l},{type:1,data:d},{type:12,data:Math.floor(d/m)},{type:1,data:t.epsilon}];s&&y.push("type");let w=r>1,_=r>2,S=z=>{let P=O(e[0].dataType),U=[A("x",e[0].dataType,e[0].dims,m),A("scale",n.dataType,n.dims,m)];s&&U.push(A("bias",s.dataType,s.dims,m)),U.push(X("output",e[0].dataType,o,m)),w&&U.push(X("mean_data_output",1,h)),_&&U.push(X("inv_std_output",1,h));let q=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${z.registerUniforms(q).declareVariables(...U)}
  ${z.mainStart()}
    ${z.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${V("f32",m)};
    var mean_square_vector = ${V("f32",m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${W(P,m,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${j("mean_vector",m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${j("mean_square_vector",m)} / uniforms.norm_size ${i?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${W(P,m,"x[j + offset]")};
      let f32scale = ${W(P,m,"scale[j]")};
      output[j + offset] = ${U[0].type.value}((f32input ${i?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${W(P,m,"bias[j]")}`:""}
      );
    }

    ${w?"mean_data_output[global_idx] = mean":""};
    ${_?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},x=[{dims:o,dataType:e[0].dataType}];return w&&x.push({dims:h,dataType:1}),_&&x.push({dims:h,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${m};${r};${i}`,inputDependencies:y},getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:$}),getShaderSource:S}},ad=(e,t)=>{rd(e.inputs),e.compute(id(e.inputs,t,e.outputCount))}}),nd,sd,of=T(()=>{_e(),wn(),xn(),nd=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},sd=e=>{nd(e.inputs);let t=er.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],i=e.inputs[0].dims[e.inputs[0].dims.length-1];if(r<8&&i<8)e.compute(_n(e.inputs,{activation:""},t));else{let a=t[t.length-2],n=D.size(e.inputs[0].dims.slice(0,-2)),s=D.size(e.inputs[1].dims.slice(0,-2));if(n!==1&&a===1&&s===1){let o=e.inputs[0].reshape([1,n,i]),u=e.inputs[1].reshape([1,i,r]),l=[1,n,r],d=[o,u];e.compute(Ua(d,{activation:""},t,l),{inputs:d})}else e.compute(Ua(e.inputs,{activation:""},t))}}}),od,ud,ld,dd,pd,uf=T(()=>{Se(),_e(),b(),ge(),od=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],i=r.dims.length;if(r.dims[i-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),n=t.blockSize/8*t.bits,s=e[1];if(!D.areEqual(s.dims,[t.n,a,n]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let o=e[2].dims;if(D.size(o)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let u=e[3].dims,l=t.bits>4?t.n*a:t.n*Math.floor((a+1)/2);if(D.size(u)!==l)throw new Error("zeroPoints input size error.")}},ud=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=D.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=R(t.k),f=R(l),h=R(s),m=o.concat([a,s]),y=a>1&&s/h%2===0?2:1,$=D.size(m)/h/y,w=64,_=[],S=[u,a,n/p],x=D.convertShape(e[1].dims).slice();x.splice(-1,1,l/f),_.push(...k(S)),_.push(...k(x)),_.push(...k(e[2].dims)),e.length===4&&_.push(...k(D.convertShape(e[3].dims)));let z=[u,a,s/h];_.push(...k(z));let P=U=>{let q=S.length,G=A("a",e[0].dataType,q,p),ie=A("b",12,x.length,f),xe=A("scales",e[2].dataType,e[2].dims.length),he=[G,ie,xe],$e=e.length===4?A("zero_points",12,e[3].dims.length):void 0;$e&&he.push($e);let Fe=z.length,Oe=X("output",e[0].dataType,Fe,h),we=O(e[0].dataType),Re=(()=>{switch(p){case 1:return`array<${we}, 8>`;case 2:return`mat4x2<${we}>`;case 4:return`mat2x4<${we}>`;default:throw new Error(`${p}-component is not supported.`)}})(),ye=()=>{let F=`
          // reuse a data
            var input_offset = ${G.indicesToOffset(`${G.type.indices}(batch, row, word_offset)`)};
            var a_data: ${Re};
            for (var j: u32 = 0; j < ${8/p}; j++) {
              a_data[j] = ${G.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let ae=0;ae<h*y;ae++)F+=`
            b_value = ${f===1?`b${ae}_data`:`b${ae}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${Re}(${Array.from({length:4},(be,Be)=>`${we}(b_value_lower[${Be}]), ${we}(b_value_upper[${Be}])`).join(", ")});
            b_dequantized_values = ${p===1?`${Re}(${Array.from({length:8},(be,Be)=>`(b_quantized_values[${Be}] - ${$e?`zero_point${ae}`:"zero_point"}) * scale${ae}`).join(", ")});`:`(b_quantized_values - ${Re}(${Array(8).fill(`${$e?`zero_point${ae}`:"zero_point"}`).join(",")})) * scale${ae};`};
            workgroup_shared[local_id.x * ${y} + ${Math.floor(ae/h)}]${h>1?`[${ae%h}]`:""} += ${Array.from({length:8/p},(be,Be)=>`${p===1?`a_data[${Be}] * b_dequantized_values[${Be}]`:`dot(a_data[${Be}], b_dequantized_values[${Be}])`}`).join(" + ")};
          `;return F},Ee=()=>{let F=`
            var col_index = col * ${h};
            ${$e?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${we}(8);`}
            `;for(let ae=0;ae<h*y;ae++)F+=`
            let scale${ae} = ${xe.getByOffset("col_index * nBlocksPerCol + block")};
            ${$e?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${$e.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${ae} = ${we}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return F},wt=()=>{let F=`col_index = col * ${h};`;for(let ae=0;ae<h*y;ae++)F+=`
            let b${ae}_data = ${ie.getByIndices(`${ie.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return F+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${Re};
            var b_dequantized_values: ${Re};`,F};return`
        var<workgroup> workgroup_shared: array<${Oe.type.value}, ${y*w}>;
        ${U.declareVariables(...he,Oe)}
        ${U.mainStart([w,1,1])}
          let output_indices = ${Oe.offsetToIndices(`(global_idx / ${w}) * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${w}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/p};
            ${Ee()}
            for (var word: u32 = 0; word < ${l}; word += ${f}) {
              ${wt()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${ye()}
                word_offset += ${8/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${y}) {
            var output_value: ${Oe.type.value} = ${Oe.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${w}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${y};
            }
            ${Oe.setByIndices(`${Oe.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${p};${f};${h};${y};${w}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:m,dataType:d}],dispatchGroup:{x:$},programUniforms:_}),getShaderSource:P}},ld=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=D.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=R(t.k),f=R(l),h=o.concat([a,s]),m=128,y=s%8===0?8:s%4===0?4:1,$=m/y,w=$*f*8,_=w/p,S=w/t.blockSize,x=D.size(h)/y,z=[],P=[u,a,n/p],U=D.convertShape(e[1].dims).slice();U.splice(-1,1,l/f),z.push(...k(P)),z.push(...k(U)),z.push(...k(e[2].dims)),e.length===4&&z.push(...k(D.convertShape(e[3].dims)));let q=[u,a,s];z.push(...k(q));let G=ie=>{let xe=P.length,he=A("a",e[0].dataType,xe,p),$e=A("b",12,U.length,f),Fe=A("scales",e[2].dataType,e[2].dims.length),Oe=[he,$e,Fe],we=e.length===4?A("zero_points",12,e[3].dims.length):void 0;we&&Oe.push(we);let Re=q.length,ye=X("output",e[0].dataType,Re),Ee=O(e[0].dataType),wt=()=>{switch(p){case 1:return`
          let a_data0 = vec4<${Ee}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Ee}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Ee}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Ee}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${p}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${he.type.value}, ${_}>;
        var<workgroup> inter_results: array<array<${ye.type.value}, ${$}>, ${y}>;
        ${ie.declareVariables(...Oe,ye)}
        ${ie.mainStart([$,y,1])}
          let output_indices = ${ye.offsetToIndices(`workgroup_index * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${S} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${_};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${_}; a_offset += ${m})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${he.getByIndices(`${he.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${he.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${S} + local_id.x;
            ${we?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${we.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Ee}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Ee}(8);`}
            let scale = ${Fe.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${$e.getByIndices(`${$e.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/p};
            for (var i: u32 = 0; i < ${f}; i++) {
              ${wt()}
              let b_value = ${f===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${Ee}>(${Array.from({length:4},(F,ae)=>`${Ee}(b_value_lower[${ae}]), ${Ee}(b_value_upper[${ae}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${Ee}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(F,ae)=>`${`dot(a_data${ae}, b_dequantized_values[${ae}])`}`).join(" + ")};
              word_offset += ${8/p};
            }
            workgroupBarrier();
          }

          if (local_idx < ${y}) {
            var output_value: ${ye.type.value} = ${ye.type.value}(0);
            for (var b = 0u; b < ${$}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${ye.setByIndices(`${ye.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${p};${f};${$};${y}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:h,dataType:d}],dispatchGroup:{x},programUniforms:z}),getShaderSource:G}},dd=(e,t)=>{od(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(ld(e.inputs,t)):e.compute(ud(e.inputs,t))},pd=e=>g(e)}),cd,fd,hd,md,gd,yd,_d,wd,bd,lf=T(()=>{Se(),_e(),ge(),cd=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},fd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
            k = i32(${e.indicesGet("indices",a)}) - ${B("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${B("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${B("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${i}
            value = x[offset];
          }
      `},hd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${B("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${B("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${B("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${B("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},md=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${B("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${B("uniforms.x_shape",a,t)})) {
                  k = i32(${B("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${B("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},gd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${B("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${B("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${B("uniforms.x_shape",a,t)})) {
                  k -= i32(${B("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${B("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},yd=(e,t,r)=>{switch(r.mode){case 0:return fd(e,t,r.pads.length);case 1:return hd(e,t,r.pads.length);case 2:return md(e,t,r.pads.length);case 3:return gd(e,t,r.pads.length);default:throw new Error("Invalid mode")}},_d=(e,t)=>{let r=D.padShape(e[0].dims.slice(),t.pads),i=e[0].dims,a=D.size(r),n=[{type:12,data:a},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&n.push({type:s?e[2].dataType:1,data:t.value}),n.push(...k(e[0].dims,r));let o=["rank"],u=l=>{let d=X("output",e[0].dataType,r.length),p=A("x",e[0].dataType,i.length),f=p.type.value,h=yd(d,i.length,t),m=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&m.push({name:"constant_value",type:s?f:"f32"}),`
            ${l.registerUniforms(m).declareVariables(p,d)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${d.offsetToIndices("global_idx")};

            var value = ${f}(0);
            ${h}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:o},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(D.size(r)/64)},programUniforms:n}),getShaderSource:u}},wd=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),i=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,n=new Int32Array(2*a).fill(0);if(e.length>=4){let o=e[3].getBigInt64Array();for(let u=0;u<o.length;u++)n[Number(o[u])]=Number(r[u]),n[Number(o[u])+a]=Number(r[u+o.length])}else r.forEach((o,u)=>n[Number(u)]=Number(o));let s=[];return n.forEach(o=>s.push(o)),{mode:t.mode,value:i,pads:s}}else return t},bd=(e,t)=>{cd(e.inputs);let r=wd(e.inputs,t);e.compute(_d(e.inputs,r),{inputs:[0]})}}),ha,Un,Nn,Ln,qn,$d,vd,Vn,Fn,xd,Sd,Wn,Td,Ed,Gn,Id,kd,Cd,zd,df=T(()=>{ht(),Se(),_e(),ge(),ha=e=>{if(K.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Un=(e,t,r)=>{let i=t.format==="NHWC",a=e.dims.slice();i&&a.splice(1,0,a.pop());let n=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),o=t.strides.slice(),u=n?t.dilations.slice():[],l=t.pads.slice();mr.adjustPoolAttributes(r,a,s,o,u,l);let d=mr.computePoolOutputShape(r,a,o,u,s,l,t.autoPad),p=Object.assign({},t);n?Object.assign(p,{kernelShape:s,strides:o,pads:l,dilations:u,cacheKey:t.cacheKey}):Object.assign(p,{kernelShape:s,strides:o,pads:l,cacheKey:t.cacheKey});let f=d.slice();return f.push(f.splice(1,1)[0]),[p,i?f:d]},Nn=(e,t)=>{let r=t.format==="NHWC",i=D.size(e),a=D.size(t.kernelShape),n=[{type:12,data:i},{type:12,data:a}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let o=t.kernelShape[t.kernelShape.length-1],u=t.strides[t.strides.length-1],l=t.pads[t.pads.length/2-1],d=t.pads[t.pads.length-1],p=!!(l+d);n.push({type:12,data:o},{type:12,data:u},{type:12,data:l},{type:12,data:d}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let f=!1;if(t.kernelShape.length===2){let h=t.kernelShape[t.kernelShape.length-2],m=t.strides[t.strides.length-2],y=t.pads[t.pads.length/2-2],$=t.pads[t.pads.length-2];f=!!(y+$),n.push({type:12,data:h},{type:12,data:m},{type:12,data:y},{type:12,data:$}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[n,s,!0,p,f]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let o=D.computeStrides(t.kernelShape);n.push({type:12,data:o},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:o.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let u=t.pads.reduce((l,d)=>l+d);return[n,s,!!u,!1,!1]}},Ln=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f=a.format==="NHWC",h=t.type.value,m=X("output",t.type.tensor,i);if(a.kernelShape.length<=2){let y="",$="",w="",_=r-(f?2:1);if(d?y=`
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
                }`,a.kernelShape.length===2){let S=r-(f?3:2);p?$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${S}] = indices[${S}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${S}] < 0 || xIndices[${S}] >= uniforms.x_shape[${S}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${S}] = indices[${S}] * uniforms.sh - uniforms.phStart + j;
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
                  offsets[j] = offset / ${B("uniforms.kernelStrides","j",y)};
                  offset -= offsets[j] * ${B("uniforms.kernelStrides","j",y)};
                }
                offsets[${y-1}] = offset;

                isPad = false;
                for (var j = ${r-y}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${B("uniforms.strides",`j - ${r-y}u`,y)}
                    + offsets[j - ${r-y}u] - ${B("uniforms.pads","j - 2u",$)};
                  ${w}
              }
              ${s}

              output[global_idx] = value;
            }`}},qn=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,$d=e=>`${qn(e)};${e.countIncludePad}`,vd=e=>`${qn(e)};${e.storageOrder};${e.dilations}`,Vn=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),Fn=(e,t,r,i)=>{let[a,n]=Un(t,i,r),s=A("x",t.dataType,t.dims.length),o=s.type.value,u="value += x_val;",l="";a.countIncludePad?l+=`value /= ${o}(uniforms.kernelSize);`:l+=`value /= ${o}(i32(uniforms.kernelSize) - pad);`;let[d,p,f,h,m]=Nn(n,a);d.push(...k(t.dims,n));let y=["rank"];return{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(D.size(n)/64)},programUniforms:d}),getShaderSource:$=>Ln($,s,t.dims.length,n.length,a,u,l,0,p,f,h,m)}},xd=e=>{let t=e.count_include_pad!==0,r=Vn(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let i={countIncludePad:t,...r,cacheKey:""};return{...i,cacheKey:$d(i)}},Sd=(e,t)=>{ha(e.inputs),e.compute(Fn("AveragePool",e.inputs[0],!1,t))},Wn={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},Td=e=>{let t=e.format;return{format:t,...Wn,cacheKey:t}},Ed=(e,t)=>{ha(e.inputs),e.compute(Fn("GlobalAveragePool",e.inputs[0],!0,t))},Gn=(e,t,r,i)=>{let[a,n]=Un(t,i,r),s=`
      value = max(x_val, value);
    `,o="",u=A("x",t.dataType,t.dims.length),l=["rank"],[d,p,f,h,m]=Nn(n,a);return d.push(...k(t.dims,n)),{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(D.size(n)/64)},programUniforms:d}),getShaderSource:y=>Ln(y,u,t.dims.length,n.length,a,s,o,t.dataType===10?-65504:-1e5,p,f,h,m)}},Id=(e,t)=>{ha(e.inputs),e.compute(Gn("MaxPool",e.inputs[0],!1,t))},kd=e=>{let t=e.storage_order,r=e.dilations,i=Vn(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...i,cacheKey:""};return{...a,cacheKey:vd(a)}},Cd=e=>{let t=e.format;return{format:t,...Wn,cacheKey:t}},zd=(e,t)=>{ha(e.inputs),e.compute(Gn("GlobalMaxPool",e.inputs[0],!0,t))}}),Ad,Od,Rd,Md,pf=T(()=>{Se(),_e(),b(),ge(),Ad=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,i)=>r===e[2].dims[i]).reduce((r,i)=>r&&i,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,n)=>n===t.axis||a===e[0].dims[n]).reduce((a,n)=>a&&n,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],i=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/i)||t.blockSize>Math.ceil(r/(i-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Od=(e,t)=>{let r=D.normalizeAxis(t.axis,e[0].dims.length),i=e[0].dataType,a=i===3,n=e[0].dims,s=e[1].dataType,o=D.size(n),u=i===3||i===2,l=u?[Math.ceil(D.size(e[0].dims)/4)]:e[0].dims,d=e[1].dims,p=e.length>2?e[2]:void 0,f=p?u?[Math.ceil(D.size(p.dims)/4)]:p.dims:void 0,h=d.length===0||d.length===1&&d[0]===1,m=h===!1&&d.length===1,y=R(o),$=h&&(!u||y===4),w=$?y:1,_=$&&!u?y:1,S=A("input",u?12:i,l.length,_),x=A("scale",s,d.length),z=p?A("zero_point",u?12:i,f.length):void 0,P=X("output",s,n.length,w),U=[S,x];z&&U.push(z);let q=[l,d];p&&q.push(f);let G=[{type:12,data:o/w},{type:12,data:r},{type:12,data:t.blockSize},...k(...q,n)],ie=xe=>{let he=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${xe.registerUniforms(he).declareVariables(...U,P)}
      ${xe.mainStart()}
          ${xe.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${P.offsetToIndices("global_idx")};

          // Set input x
          ${u?`
            let input = ${S.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${w===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${S.getByOffset("global_idx")};`};

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
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${z.getByIndices("scale_indices")};`:`let zero_point_value = ${u?a?"i32":"u32":S.type.value}(0);`};
      // Compute and write output
      ${P.setByOffset("global_idx",`${P.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:z?["rank","rank","rank"]:["rank","rank"]},getShaderSource:ie,getRunData:()=>({outputs:[{dims:n,dataType:s}],dispatchGroup:{x:Math.ceil(o/w/64),y:1,z:1},programUniforms:G})}},Rd=(e,t)=>{Ad(e.inputs,t),e.compute(Od(e.inputs,t))},Md=e=>g({axis:e.axis,blockSize:e.blockSize})}),Bd,Dd,Pd,cf=T(()=>{ht(),Se(),ge(),Bd=(e,t,r)=>{let i=e===t,a=e<t&&r<0,n=e>t&&r>0;if(i||a||n)throw new Error("Range these inputs' contents are invalid.")},Dd=(e,t,r,i)=>{let a=Math.abs(Math.ceil((t-e)/r)),n=[a],s=a,o=[{type:12,data:s},{type:i,data:e},{type:i,data:r},...k(n)],u=l=>{let d=X("output",i,n.length),p=d.type.value,f=[{name:"outputSize",type:"u32"},{name:"start",type:p},{name:"delta",type:p}];return`
        ${l.registerUniforms(f).declareVariables(d)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${p}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${i}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:n,dataType:i}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:o})}},Pd=e=>{let t=0,r=0,i=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],i=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],i=e.inputs[2].getFloat32Array()[0]),K.webgpu.validateInputContent&&Bd(t,r,i),e.compute(Dd(t,r,i,e.inputs[0].dataType),{inputs:[]})}}),Ud,jn,Hn,Nd,Ld,qd,ff=T(()=>{Se(),_e(),b(),ge(),Ud=(e,t,r,i)=>{if(e!=="none"&&i!=="i32"&&i!=="u32"&&i!=="f32")throw new Error(`Input ${i} is not supported with reduction ${e}.`);let a=`{
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
                ${a}max(bitcast<f32>(oldValue), (${r}))${n}`;case"min":return i==="i32"||i==="u32"?`atomicMin(&${t}, bitcast<${i}>(${r}));`:`${a}min(bitcast<${i}>(oldValue), (${r}))${n}`;case"mul":return`${a}(bitcast<${i}>(oldValue) * (${r}))${n}`;default:throw new Error(`Reduction ${e} is not supported.`)}},jn=(e,t)=>`${e===1?`
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
    data_offset += u32((u32(index) * element_count_dim));`,Hn=(e,t,r)=>`for (var i = 0u; i < uniforms.num_updates_elements; i++) {
        let value = updates[uniforms.num_updates_elements * ${r?"global_idx":"idx"} + i];
        ${Ud(e.reduction,"output[data_offset + i]","value",t)}
      }`,Nd=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r,n=1,s=Math.ceil(D.size(i)/n),o=i[i.length-1],u=D.sizeFromDimension(r,o),l=D.sizeFromDimension(i,0)/o,d=[{type:12,data:s},{type:12,data:o},{type:12,data:u},...k(e[1].dims,e[2].dims,a)],p=f=>{let h=A("indices",e[1].dataType,e[1].dims.length),m=A("updates",e[2].dataType,e[2].dims.length,n),y=t.reduction!=="none"&&t.reduction!==""?Je("output",e[0].dataType,a.length):X("output",e[0].dataType,a.length,n);return`
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
        ${jn(r.length,!1)}
      }
      ${Hn(t,y.type.value,!1)}
    }
    return;
  }

  var data_offset = 0u;
  var indices_start = uniforms.last_index_dimension * global_idx;
  var indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${jn(r.length,!0)}
  }
  ${Hn(t,y.type.value,!0)}
  }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}),getShaderSource:p}},Ld=e=>g({reduction:e.reduction}),qd=(e,t)=>{e.compute(Nd(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Vd,Fd,Wd,Kn,Gd,jd,Hd,Kd,Zd,Qd,Xd,Yd,Zn,Jd,ep,tp,rp,ip,ap,np,hf=T(()=>{Se(),_e(),b(),ge(),Vd=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Fd=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let i=new Array(r).fill(1);return t.forEach((a,n)=>i[a]=e[n]),i},Wd=(e,t,r,i,a,n)=>{let[s,o,u]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(d=>n.push(d));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(o>0&&e.length>o&&e[o].dims.length===1&&e[o].dims[0]>0){if(e[o].getFloat32Array().forEach(d=>i.push(d)),i.length!==0&&i.length!==l&&r>=18&&i.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Vd(i,t),t.axes.length>0&&Fd(i,t.axes,l).forEach((d,p)=>i[p]=d)}if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0&&(e[u].getBigInt64Array().forEach(d=>a.push(Number(d))),a.length!==0&&a.length!==l&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(i.length!==0&&i.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof i<"u"&&typeof a<"u"&&i.length>0&&a.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},Kn=(e,t,r,i)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${i}(big / (${r}));
  let fract = ${i}(big % (${r})) / ${i}(${r});
  return whole + fract;
`,Gd=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${Kn("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${Kn("xResized","lengthOriginal - 1","lengthResized - 1",t)}
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
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",jd=(e,t,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",Hd=(e,t,r)=>{let i=new Array(r).fill(0).concat(new Array(r).fill(1)),a=e.length===0?i:e.slice();return t.length>0?(t.forEach((n,s)=>{i[n]=a[s],i[s+r]=a[t.length+s]}),i):a},Kd=(e,t,r,i)=>{let a=[];if(r.length>0)if(i.length>0){if(e.forEach(n=>a.push(n)),Math.max(...i)>e.length)throw new Error("axes is out of bound");i.forEach((n,s)=>a[n]=r[s])}else r.forEach(n=>a.push(n));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");a=e.map((n,s)=>Math.round(n*t[s]))}return a},Zd=(e,t,r)=>{let i=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(n=>t[n]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(n=>t[n]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let a=e.slice();return r.axes.length>0?(r.axes.forEach(n=>t[n]=i),r.axes.forEach(n=>a[n]=Math.round(e[n]*t[n]))):(t.fill(i,0,t.length),a.forEach((n,s)=>a[s]=Math.round(n*t[s]))),a},Qd=(e,t,r,i,a)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${r.length}> {
      var original_indices: array<${e.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${B("uniforms.scales","i",i)};
        var roi_low = ${B("uniforms.roi","i",a)};
        var roi_hi = ${B("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${B("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${B("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Xd=(e,t,r,i,a,n,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${B("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${B("uniforms.roi","i",n)};
          var roi_hi = ${B("uniforms.roi",`i + ${r.length}`,n)};
          var input_shape_i = ${B("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${B("uniforms.output_shape","i",i.length)};
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
    }`,Yd=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${B("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,Zn=(e,t,r,i)=>e.rank>i?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",r,"batch")};
`:"",Jd=(e,t,r,i,a)=>{let[n,s,o,u]=r.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(row, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(col, ${r[o]} - 1))`)};
      ${Zn(e,u,n,2)}
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
    }`},ep=(e,t,r,i,a,n,s,o,u,l)=>{let d=r.length===2,[p,f]=d?[0,1]:[2,3],h=e.type.value,m=y=>{let $=y===p?"row":"col";return`
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
    `},tp=(e,t,r,i,a)=>{let[n,s,o,u,l]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],d=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${d} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(depth, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(height, ${r[o]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(width, ${r[u]} - 1))`)};
      ${Zn(e,l,n,3)}
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
    }`},rp=(e,t,r,i,a,n)=>{let s=e.dims,o=Hd(n,t.axes,s.length),u=Kd(s,i,a,t.axes),l=i.slice();i.length===0&&(l=s.map((_,S)=>_===0?1:u[S]/_),t.keepAspectRatioPolicy!=="stretch"&&(u=Zd(s,l,t)));let d=X("output",e.dataType,u.length),p=A("input",e.dataType,s.length),f=D.size(u),h=s.length===u.length&&s.every((_,S)=>_===u[S]),m=t.coordinateTransformMode==="tf_crop_and_resize",y=t.extrapolationValue,$=p.type.value,w=_=>`
      ${h?"":`
      ${Gd(t.coordinateTransformMode,$)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Yd(p,s)};
              ${jd(t.nearestMode,r,$)};
              ${Xd(p,d,s,u,l.length,o.length,m)};
              `;case"linear":return`
              ${Qd(d,s,u,l.length,o.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${Jd(p,d,s,m,y)}`;if(s.length===3||s.length===5)return`${tp(p,d,s,m,y)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${ep(p,d,s,u,l,o,t.cubicCoeffA,m,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
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
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${l.length>0?t.mode==="cubic"?l:l.length:""}|${a.length>0?a:""}|${o.length>0?o:""}|${h}|${t.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:u,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},{type:1,data:l},{type:1,data:o},...k(s,u)]})}},ip=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},ap=(e,t)=>{let r=[],i=[],a=[],n=ip(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");Wd(e.inputs,t,n,r,i,a),e.compute(rp(e.inputs[0],t,n,r,i,a),{inputs:[0]})},np=e=>{let t=e.antialias,r=e.axes,i=e.coordinateTransformMode,a=e.cubicCoeffA,n=e.excludeOutside!==0,s=e.extrapolationValue,o=e.keepAspectRatioPolicy,u=e.mode,l=e.nearestMode===""?"simple":e.nearestMode;return g({antialias:t,axes:r,coordinateTransformMode:i,cubicCoeffA:a,excludeOutside:n,extrapolationValue:s,keepAspectRatioPolicy:o,mode:u,nearestMode:l})}}),sp,op,up,mf=T(()=>{Se(),_e(),ge(),sp=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],i=e[2];if(t.dataType!==r.dataType||t.dataType!==i.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],n=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==n)throw new Error("Skip must have the same sequence length as input");if(i.dims.length!==1)throw new Error("Gamma must be 1D");if(i.dims[i.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},op=(e,t,r,i)=>{let a=t.simplified,n=e[0].dims,s=D.size(n),o=n,u=s,l=n.slice(-1)[0],d=i?n.slice(0,-1).concat(1):[],p=!a&&e.length>3,f=e.length>4,h=i&&r>1,m=i&&r>2,y=r>3,$=64,w=R(l),_=[{type:12,data:u},{type:12,data:w},{type:12,data:l},{type:1,data:t.epsilon}],S=z=>{let P=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],U=[A("x",e[0].dataType,e[0].dims,w),A("skip",e[1].dataType,e[1].dims,w),A("gamma",e[2].dataType,e[2].dims,w)];p&&U.push(A("beta",e[3].dataType,e[3].dims,w)),f&&U.push(A("bias",e[4].dataType,e[4].dims,w)),U.push(X("output",e[0].dataType,o,w)),h&&U.push(X("mean_output",1,d)),m&&U.push(X("inv_std_output",1,d)),y&&U.push(X("input_skip_bias_sum",e[0].dataType,o,w));let q=O(e[0].dataType),G=O(1,w);return`

      ${z.registerUniforms(P).declareVariables(...U)}
      var<workgroup> sum_shared : array<${G}, ${$}>;
      var<workgroup> sum_squared_shared : array<${G}, ${$}>;

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
          let bias_value = ${f?"bias[offset1d + i]":q+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${y?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${W(q,w,"value")};
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
        let mean = ${j("sum",w)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${j("square_sum",w)} / f32(uniforms.hidden_size) ${a?"":"- mean * mean"} + uniforms.epsilon);
        ${h?"mean_output[global_idx] = mean;":""}
        ${m?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${a?"":`- ${q}(mean)`}) *
            ${q}(inv_std_dev) * gamma[offset1d + i]
            ${p?"+ beta[offset1d + i]":""};
        }
      }`},x=[{dims:o,dataType:e[0].dataType}];return r>1&&x.push({dims:d,dataType:1}),r>2&&x.push({dims:d,dataType:1}),r>3&&x.push({dims:n,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${w};${h};${m};${y}`,inputDependencies:e.map((z,P)=>"type")},getShaderSource:S,getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(u/l)},programUniforms:_})}},up=(e,t)=>{sp(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(op(e.inputs,t,e.outputCount,!1),{outputs:r})}}),lp,ma,dp,Qn,pp,cp,fp,hp,gf=T(()=>{Se(),_e(),b(),ge(),lp=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,i)=>{if(e[i+1].dataType!==6&&e[i+1].dataType!==7)throw new Error(`Input ${i} must be an array of int32 or int64`)})},ma=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(i=>r.push(Number(i)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(i=>r.push(Number(i)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},dp=(e,t)=>{if(e.length>1){let r=ma(e,1),i=ma(e,2),a=ma(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),g({starts:r,ends:i,axes:a})}else return t},Qn=(e,t,r,i,a)=>{let n=e;return e<0&&(n+=r[i[t]]),a[t]<0?Math.max(0,Math.min(n,r[i[t]]-1)):Math.max(0,Math.min(n,r[i[t]]))},pp=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length}; i >= 0; i--) {
            let input_shape_i = ${B("uniforms.input_shape","i",r.length)};
            let steps_i = ${B("uniforms.steps","i",r.length)};
            let signs_i = ${B("uniforms.signs","i",r.length)};
            let starts_i = ${B("uniforms.starts","i",r.length)};
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
      }`,cp=(e,t)=>{let r=e[0].dims,i=D.size(r),a=t.axes.length>0?D.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],n=ma(e,4);n.forEach(w=>w!==0||(()=>{throw new Error("step cannot be 0")})),n.length===0&&(n=Array(a.length).fill(1));let s=t.starts.map((w,_)=>Qn(w,_,r,a,n)),o=t.ends.map((w,_)=>Qn(w,_,r,a,n));if(a.length!==s.length||a.length!==o.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let w=0;w<r.length;++w)a.includes(w)||(s.splice(w,0,0),o.splice(w,0,r[w]),n.splice(w,0,1));let u=n.map(w=>Math.sign(w));n.forEach((w,_,S)=>{if(w<0){let x=(o[_]-s[_])/w,z=s[_],P=z+x*n[_];s[_]=P,o[_]=z,S[_]=-w}});let l=r.slice(0);a.forEach((w,_)=>{l[w]=Math.ceil((o[w]-s[w])/n[w])});let d={dims:l,dataType:e[0].dataType},p=X("output",e[0].dataType,l.length),f=A("input",e[0].dataType,e[0].dims.length),h=D.size(l),m=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:n.length}],y=[{type:12,data:h},{type:12,data:s},{type:6,data:u},{type:12,data:n},...k(e[0].dims,l)],$=w=>`
      ${w.registerUniforms(m).declareVariables(f,p)}
        ${pp(f,p,r)}
        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${p.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${p.setByOffset("global_idx",f.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${s.length}_${n.length}`,inputDependencies:["rank"]},getShaderSource:$,getRunData:()=>({outputs:[d],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:y})}},fp=(e,t)=>{lp(e.inputs,t);let r=dp(e.inputs,t);e.compute(cp(e.inputs,r),{inputs:[0]})},hp=e=>{let t=e.starts,r=e.ends,i=e.axes;return g({starts:t,ends:r,axes:i})}}),mp,gp,yp,_p,yf=T(()=>{Se(),_e(),b(),gt(),ge(),mp=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},gp=(e,t)=>{let r=e.inputs[0],i=r.dims,a=D.size(i),n=i.length,s=D.normalizeAxis(t.axis,n),o=s<i.length-1,u,l=[];o?(l=Array.from({length:n},(U,q)=>q),l[s]=n-1,l[n-1]=s,u=e.compute(bt(r,l),{inputs:[r],outputs:[-1]})[0]):u=r;let d=u.dims,p=d[n-1],f=a/p,h=R(p),m=p/h,y=64;f===1&&(y=256);let $=(U,q)=>q===4?`max(max(${U}.x, ${U}.y), max(${U}.z, ${U}.w))`:q===2?`max(${U}.x, ${U}.y)`:q===3?`max(max(${U}.x, ${U}.y), ${U}.z)`:U,w=A("x",u.dataType,u.dims,h),_=X("result",u.dataType,u.dims,h),S=w.type.value,x=O(u.dataType)==="f32"?`var threadMax = ${S}(-3.402823e+38f);`:`var threadMax = ${S}(-65504.0h);`,z=U=>`
      var<workgroup> rowMaxShared : ${S};
      var<workgroup> rowSumShared : ${S};
      var<workgroup> threadShared : array<${S}, ${y}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${S} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${S}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${U.registerUniform("packedCols","i32").declareVariables(w,_)}
      ${U.mainStart(y)}
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
          rowMaxShared = ${S}(${$("threadShared[0]",h)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${S}(0.0);
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
          rowSumShared = ${S}(${j("threadShared[0]",h)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`,P=e.compute({name:"Softmax",shaderCache:{hint:`${h};${y}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:d,dataType:u.dataType}],dispatchGroup:{x:f},programUniforms:[{type:6,data:m}]}),getShaderSource:z},{inputs:[u],outputs:[o?-1:0]})[0];o&&e.compute(bt(P,l),{inputs:[P]})},yp=(e,t)=>{mp(e.inputs),gp(e,t)},_p=e=>g({axis:e.axis})}),Xn,wp,bp,$p,vp,_f=T(()=>{Se(),_e(),ge(),Xn=e=>Array.from(e.getBigInt64Array(),Number),wp=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Xn(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},bp=(e,t)=>{let r=[];for(let i=0;i<e.length;++i)r.push(e[i]*t[i]);return r},$p=(e,t)=>{let r=e[0].dims,i=t??Xn(e[1]),a=bp(r,i),n=D.size(a),s=e[0].dataType,o=A("input",s,r.length),u=X("output",s,a.length),l=d=>`
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
    }`;return{name:"Tile",shaderCache:{hint:`${i}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:[{type:12,data:n},...k(e[0].dims,a)]}),getShaderSource:l}},vp=e=>{wp(e.inputs),e.compute($p(e.inputs),{inputs:[0]})}}),xp,Sp,Tp,wf=T(()=>{Se(),_e(),ge(),xp=(e,t,r,i,a)=>{let n=X("output_data",a,r.length,4),s=A("a_data",t[1].dataType,t[1].dims.length,4),o=A("b_data",t[2].dataType,t[2].dims.length,4),u=A("c_data",t[0].dataType,t[0].dims.length,4),l,d=(p,f,h)=>`select(${f}, ${p}, ${h})`;if(!i)l=n.setByOffset("global_idx",d(s.getByOffset("global_idx"),o.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let p=(f,h,m="")=>{let y=`a_data[index_a${h}][component_a${h}]`,$=`b_data[index_b${h}][component_b${h}]`,w=`bool(c_data[index_c${h}] & (0xffu << (component_c${h} * 8)))`;return`
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
      }`},Sp=e=>{let t=e[1].dims,r=e[2].dims,i=e[0].dims,a=e[1].dataType,n=!(D.areEqual(t,r)&&D.areEqual(r,i)),s=t,o=D.size(t);if(n){let l=er.calcShape(er.calcShape(t,r,!1),i,!1);if(!l)throw new Error("Can't perform where op on the given tensors");s=l,o=D.size(s)}let u=Math.ceil(o/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>xp(l,e,s,n,a),getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64/4)},programUniforms:[{type:12,data:u},...k(i,t,r,s)]})}},Tp=e=>{e.compute(Sp(e.inputs))}}),Ep,bf=T(()=>{Rc(),pn(),Mc(),Bc(),Dc(),Pc(),Uc(),Fc(),Gc(),jc(),Hc(),Kc(),Zc(),Qc(),Xc(),Yc(),Jc(),ef(),tf(),rf(),af(),nf(),sf(),of(),uf(),Ul(),lf(),df(),pf(),cf(),ff(),un(),hf(),Kl(),mf(),gf(),yf(),Gl(),_f(),gt(),mn(),wf(),Ep=new Map([["Abs",[no]],["Acos",[so]],["Acosh",[oo]],["Add",[Zo]],["ArgMax",[Ws,dn]],["ArgMin",[Fs,dn]],["Asin",[uo]],["Asinh",[lo]],["Atan",[po]],["Atanh",[co]],["Attention",[Qs]],["AveragePool",[Sd,xd]],["BatchNormalization",[eo]],["BiasAdd",[io]],["BiasSplitGelu",[jo]],["Cast",[ho,fo]],["Ceil",[yo]],["Clip",[go]],["Concat",[lu,du]],["Conv",[kn,En]],["ConvTranspose",[Pu,Mu]],["Cos",[_o]],["Cosh",[wo]],["CumSum",[Nu,Lu]],["DepthToSpace",[Wu,Gu]],["DequantizeLinear",[Rd,Md]],["Div",[Qo]],["Einsum",[Xu,Yu]],["Elu",[bo,la]],["Equal",[Xo]],["Erf",[$o]],["Exp",[vo]],["Expand",[rl]],["FastGelu",[al]],["Floor",[xo]],["FusedConv",[kn,En]],["Gather",[ul,ol]],["GatherElements",[wl,_l]],["GatherBlockQuantized",[hl,ml]],["GatherND",[dl,pl]],["Gelu",[So]],["Gemm",[xl,vl]],["GlobalAveragePool",[Ed,Td]],["GlobalMaxPool",[zd,Cd]],["Greater",[tu]],["GreaterOrEqual",[iu]],["GridSample",[Ol,Rl]],["GroupQueryAttention",[Yl]],["HardSigmoid",[Oo,Ao]],["InstanceNormalization",[td]],["LayerNormalization",[ad]],["LeakyRelu",[To,la]],["Less",[ru]],["LessOrEqual",[au]],["Log",[Lo]],["MatMul",[sd]],["MatMulNBits",[dd,pd]],["MaxPool",[Id,kd]],["Mul",[Yo]],["MultiHeadAttention",[Pl,Bl]],["Neg",[Io]],["Not",[Eo]],["Pad",[bd]],["Pow",[Jo]],["QuickGelu",[Fo,la]],["Range",[Pd]],["Reciprocal",[ko]],["ReduceMin",[Us]],["ReduceMean",[Rs]],["ReduceMax",[Ps]],["ReduceSum",[Ls]],["ReduceProd",[Ns]],["ReduceL1",[Ms]],["ReduceL2",[Bs]],["ReduceLogSum",[Vs]],["ReduceLogSumExp",[Ds]],["ReduceSumSquare",[qs]],["Relu",[Co]],["Resize",[ap,np]],["RotaryEmbedding",[Hl]],["ScatterND",[qd,Ld]],["Sigmoid",[zo]],["Sin",[Ro]],["Sinh",[Mo]],["Slice",[fp,hp]],["SkipLayerNormalization",[up]],["Split",[Fl,Wl]],["Sqrt",[Bo]],["Softmax",[yp,_p]],["Sub",[eu]],["Tan",[Do]],["Tanh",[Po]],["ThresholdedRelu",[No,la]],["Tile",[vp]],["Transpose",[sa,Bt]],["Where",[Tp]]])}),Ip,$f=T(()=>{ht(),Mt(),ge(),Ip=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,i,a){pt(e.programInfo.name);let n=this.backend.device,s=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let o=[];for(let l of t)o.push({binding:o.length,resource:{buffer:l.buffer}});for(let l of r)o.push({binding:o.length,resource:{buffer:l.buffer}});a&&o.push({binding:o.length,resource:a});let u=n.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:o,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let l={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:u,dispatchGroup:i};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(l)}s.setPipeline(e.computePipeline),s.setBindGroup(0,u),s.dispatchWorkgroups(...i),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),ut(e.programInfo.name)}dispose(){}build(e,t){pt(e.name);let r=this.backend.device,i=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(l=>{r.features.has(l.feature)&&i.push(`enable ${l.extension};`)});let a=Ze(t,this.backend.device.limits),n=e.getShaderSource(a),s=`${i.join(`
`)}
${a.additionalImplementations}
${n}`,o=r.createShaderModule({code:s,label:e.name});De("verbose",()=>`[WebGPU] ${e.name} shader code: ${s}`);let u=r.createComputePipeline({compute:{module:o,entryPoint:"main"},layout:"auto",label:e.name});return ut(e.name),{programInfo:e,computePipeline:u,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,i=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&i<=a)return[t,r,i];let n=t*r*i,s=Math.ceil(Math.sqrt(n));if(s>a){if(s=Math.ceil(Math.cbrt(n)),s>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[s,s,s]}else return[s,s,1]}}}),kp={};ee(kp,{WebGpuBackend:()=>Op});var Cp,zp,Ap,Op,vf=T(()=>{ht(),Se(),Mt(),gr(),sn(),bf(),$f(),Cp=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let i=0;i<e.length;++i){let a=e[i].dataType;switch(t[i]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let n=e[i].dims.length;r.push(`${a};${n}`);break}case"dims":{let n=e[i].dims.join(",");r.push(`${a};${n}`);break}default:throw new Error(`unsupported input dependency: ${t[i]}`)}}return r.join("|")},zp=(e,t,r)=>{var a,n;let i=e.name;return(a=e.shaderCache)!=null&&a.hint&&(i+="["+e.shaderCache.hint+"]"),i+=":"+r+`:${Cp(t,((n=e.shaderCache)==null?void 0:n.inputDependencies)??new Array(t.length).fill("dims"))}`,i},Ap=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Op=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],i={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r},a=n=>t.features.has(n)&&r.push(n)&&!0;a("chromium-experimental-timestamp-query-inside-passes")||a("timestamp-query"),a("shader-f16"),a("subgroups"),this.device=await t.requestDevice(i),this.adapterInfo=new Ap(t.info||await t.requestAdapterInfo()),this.gpuDataManager=za(this),this.programManager=new Ip(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,fi(e.logLevel,!!e.debug),this.device.onuncapturederror=n=>{n.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${n.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;pt(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var i;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let n=r[a],s=n.kernelId,o=this.kernels.get(s),u=o.kernelType,l=o.kernelName,d=n.programName,p=n.inputTensorViews,f=n.outputTensorViews,h=t[a*2],m=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=h);let y=Number(h-this.queryTimeBase),$=Number(m-this.queryTimeBase);if(!Number.isSafeInteger(y)||!Number.isSafeInteger($))throw new RangeError("incorrect timestamp range");if((i=this.env.webgpu.profiling)!=null&&i.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:p.map(w=>({dims:w.dims,dataType:It(w.dataType)})),outputsMetadata:f.map(w=>({dims:w.dims,dataType:It(w.dataType)})),kernelId:s,kernelType:u,kernelName:l,programName:d,startTime:y,endTime:$});else{let w="";p.forEach((S,x)=>{w+=`input[${x}]: [${S.dims}] | ${It(S.dataType)}, `});let _="";f.forEach((S,x)=>{_+=`output[${x}]: [${S.dims}] | ${It(S.dataType)}, `}),console.log(`[profiling] kernel "${s}|${u}|${l}|${d}" ${w}${_}execution time: ${$-y} ns`)}dt("GPU",`${d}::${h}::${m}`)}e.unmap(),this.pendingQueries.delete(e)}),ut()}run(e,t,r,i,a,n){pt(e.name);let s=[];for(let _=0;_<t.length;++_){let S=t[_].data;if(S===0)continue;let x=this.gpuDataManager.get(S);if(!x)throw new Error(`no GPU data for input: ${S}`);s.push(x)}let{outputs:o,dispatchGroup:u,programUniforms:l}=e.getRunData(t),d=r.length===0?o.map((_,S)=>S):r;if(d.length!==o.length)throw new Error(`Output size ${d.length} must be equal to ${o.length}.`);let p=[],f=[];for(let _=0;_<o.length;++_){if(!Number.isInteger(d[_])||d[_]<-3||d[_]>=n)throw new Error(`Invalid output index: ${d[_]}`);if(d[_]===-3)continue;let S=d[_]===-1,x=d[_]===-2,z=S||x?a(o[_].dataType,o[_].dims):i(d[_],o[_].dataType,o[_].dims);if(p.push(z),z.data===0)continue;let P=this.gpuDataManager.get(z.data);if(!P)throw new Error(`no GPU data for output: ${z.data}`);if(S&&this.temporaryData.push(P),x){let U=this.kernelPersistentData.get(this.currentKernelId);U||(U=[],this.kernelPersistentData.set(this.currentKernelId,U)),U.push(P)}f.push(P)}if(s.length!==t.length||f.length!==p.length){if(f.length===0)return ut(e.name),p;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let h;if(l){let _=0,S=[];l.forEach(U=>{let q=typeof U.data=="number"?[U.data]:U.data;if(q.length===0)return;let G=U.type===10?2:4,ie,xe;U.type===10?(xe=q.length>4?16:q.length>2?8:q.length*G,ie=q.length>4?16:G*q.length):(xe=q.length<=2?q.length*G:16,ie=16),_=Math.ceil(_/xe)*xe,S.push(_);let he=U.type===10?8:4;_+=q.length>4?Math.ceil(q.length/he)*ie:q.length*G});let x=16;_=Math.ceil(_/x)*x;let z=new ArrayBuffer(_);l.forEach((U,q)=>{let G=S[q],ie=typeof U.data=="number"?[U.data]:U.data;if(U.type===6)new Int32Array(z,G,ie.length).set(ie);else if(U.type===12)new Uint32Array(z,G,ie.length).set(ie);else if(U.type===10)new Uint16Array(z,G,ie.length).set(ie);else if(U.type===1)new Float32Array(z,G,ie.length).set(ie);else throw new Error(`Unsupported uniform type: ${It(U.type)}`)});let P=this.gpuDataManager.create(_,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(P.buffer,0,z,0,_),this.gpuDataManager.release(P.id),h={offset:0,size:_,buffer:P.buffer}}let m=this.programManager.normalizeDispatchGroupSize(u),y=m[1]===1&&m[2]===1,$=zp(e,t,y),w=this.programManager.getArtifact($);if(w||(w=this.programManager.build(e,m),this.programManager.setArtifact($,w),De("info",()=>`[artifact] key: ${$}, programName: ${e.name}`)),l&&w.uniformVariablesInfo){if(l.length!==w.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${w.uniformVariablesInfo.length}, got ${l.length} in program "${w.programInfo.name}".`);for(let _=0;_<l.length;_++){let S=l[_],x=S.type,z=typeof S.data=="number"?1:S.data.length,[P,U]=w.uniformVariablesInfo[_];if(x!==P||z!==U)throw new Error(`Uniform variable ${_} mismatch: expect type ${P} with size ${U}, got type ${x} with size ${z} in program "${w.programInfo.name}".`)}}if(De("info",()=>`[ProgramManager] run "${e.name}" (key=${$}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let _={kernelId:this.currentKernelId,programName:w.programInfo.name,inputTensorViews:t,outputTensorViews:p};this.pendingKernels.push(_),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(_)}return this.programManager.run(w,s,f,m,h),ut(e.name),p}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,i){let a=Ep.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let n={kernelType:e,kernelName:i,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,n)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let i=this.kernels.get(e);if(!i)throw new Error(`kernel not created: ${e}`);let a=i.kernelType,n=i.kernelName,s=i.kernelEntry,o=i.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${n}" is not allowed to be called recursively`);this.currentKernelId=e,o[0]&&(o[1]=o[0](o[1]),o[0]=void 0),De("info",()=>`[WebGPU] Start to run kernel "[${a}] ${n}"...`);let u=this.env.debug;this.temporaryData=[];try{return u&&this.device.pushErrorScope("validation"),s(t,o[1]),0}catch(l){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${n}" failed. ${l}`)),1}finally{u&&r.push(this.device.popErrorScope().then(l=>l?`GPU validation error for kernel "[${a}] ${n}": ${l.message}`:null));for(let l of this.temporaryData)this.gpuDataManager.release(l.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,i){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let n=a.get(t),s=this.gpuDataManager.registerExternalBuffer(r,i,n);return a.set(t,[s,r]),s}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let i=await aa(this,e,t);return tr(i.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){De("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){De("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){De("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let i=0;i<r;i++){let a=this.getComputePassEncoder(),n=e[i];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(n.computePipeline),a.setBindGroup(0,n.bindGroup),a.dispatchWorkgroups(...n.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[i]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Rp={};ee(Rp,{init:()=>Bp});var Fa,Mp,Bp,xf=T(()=>{Se(),Mt(),_e(),ia(),Fa=class Ic{constructor(t,r,i,a){this.module=t,this.dataType=r,this.data=i,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=D.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=D.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=D.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=D.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(D.size(t)!==D.size(this.dims))throw new Error("Invalid new shape");return new Ic(this.module,this.dataType,this.data,t)}},Mp=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let i=e.PTR_SIZE,a=r/e.PTR_SIZE,n=i===4?"i32":"i64";this.opKernelContext=Number(e.getValue(i*a++,n));let s=Number(e.getValue(i*a++,n));this.outputCount=Number(e.getValue(i*a++,n)),this.customDataOffset=Number(e.getValue(i*a++,"*")),this.customDataSize=Number(e.getValue(i*a++,n));let o=[];for(let u=0;u<s;u++){let l=Number(e.getValue(i*a++,n)),d=Number(e.getValue(i*a++,"*")),p=Number(e.getValue(i*a++,n)),f=[];for(let h=0;h<p;h++)f.push(Number(e.getValue(i*a++,n)));o.push(new Fa(e,l,d,f))}this.inputs=o}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var s;let r=((s=t==null?void 0:t.inputs)==null?void 0:s.map(o=>typeof o=="number"?this.inputs[o]:o))??this.inputs,i=(t==null?void 0:t.outputs)??[],a=(o,u,l)=>new Fa(this.module,u,this.output(o,l),l),n=(o,u)=>{let l=kt(o,u);if(!l)throw new Error(`Unsupported data type: ${o}`);let d=l>0?this.backend.gpuDataManager.create(l).id:0;return new Fa(this.module,o,d,u)};return this.backend.run(e,r,i,a,n,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let i=this.module.PTR_SIZE,a=i===4?"i32":"i64",n=this.module.stackAlloc((1+t.length)*i);this.module.setValue(n,t.length,a);for(let s=0;s<t.length;s++)this.module.setValue(n+i*(s+1),t[s],a);return this.module._JsepOutput(this.opKernelContext,e,n)}catch(i){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${i}`)}finally{this.module.stackRestore(r)}}},Bp=async(e,t,r,i)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let n=(vf(),de(kp)).WebGpuBackend,s=new n;await s.initialize(r,i),a("webgpu",[s,o=>s.alloc(Number(o)),o=>s.free(o),(o,u,l,d=!1)=>{if(d)De("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(o)}, dst=${Number(u)}, size=${Number(l)}`),s.memcpy(Number(o),Number(u));else{De("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(o)}, gpuDataId=${Number(u)}, size=${Number(l)}`);let p=t.HEAPU8.subarray(Number(o>>>0),Number(o>>>0)+Number(l));s.upload(Number(u),p)}},async(o,u,l)=>{De("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${o}, dataOffset=${u}, size=${l}`),await s.download(Number(o),()=>t.HEAPU8.subarray(Number(u)>>>0,Number(u+l)>>>0))},(o,u,l)=>s.createKernel(o,Number(u),l,t.UTF8ToString(t._JsepGetNodeName(Number(u)))),o=>s.releaseKernel(o),(o,u,l,d)=>{De("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${o}, contextDataOffset=${u}`);let p=new Mp(t,s,Number(u));return s.computeKernel(Number(o),p,d)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let n=new ra(r);a("webnn",[n,()=>n.reserveTensorId(),s=>n.releaseTensorId(s),async(s,o,u,l,d)=>n.ensureTensor(s,o,u,l,d),(s,o)=>{n.uploadTensor(s,o)},async(s,o)=>n.downloadTensor(s,o)])}}}),Dp,Yn,Jn,br,Pp,es,Wa,ts,rs,is,as,ns,ss,Up=T(()=>{an(),nn(),Se(),Tt(),Lr(),Qi(),Dp=(e,t)=>{Te()._OrtInit(e,t)!==0&&ve("Can't initialize onnxruntime.")},Yn=async e=>{Dp(e.wasm.numThreads,Vr(e.logLevel))},Jn=async(e,t)=>{var r,i;(i=(r=Te()).asyncInit)==null||i.call(r);{let a=(xf(),de(Rp)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let n=e.webgpu.adapter;if(n){if(typeof n.limits!="object"||typeof n.features!="object"||typeof n.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let s=e.webgpu.powerPreference;if(s!==void 0&&s!=="low-power"&&s!=="high-performance")throw new Error(`Invalid powerPreference setting: "${s}"`);let o=e.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:s,forceFallbackAdapter:o}),!n)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await a("webgpu",Te(),e,n)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await a("webnn",Te(),e)}}},br=new Map,Pp=e=>{let t=Te(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetInputOutputCount(e,a,a+i)!==0&&ve("Can't get session input/output count.");let n=i===4?"i32":"i64";return[Number(t.getValue(a,n)),Number(t.getValue(a+i,n))]}finally{t.stackRestore(r)}},es=(e,t)=>{let r=Te(),i=r.stackSave(),a=0;try{let n=r.PTR_SIZE,s=r.stackAlloc(2*n);r._OrtGetInputOutputMetadata(e,t,s,s+n)!==0&&ve("Can't get session input/output metadata.");let o=Number(r.getValue(s,"*"));a=Number(r.getValue(s+n,"*"));let u=r.HEAP32[a/4];if(u===0)return[o,0];let l=r.HEAPU32[a/4+1],d=[];for(let p=0;p<l;p++){let f=Number(r.getValue(a+8+p*n,"*"));d.push(f!==0?r.UTF8ToString(f):Number(r.getValue(a+8+(p+l)*n,"*")))}return[o,u,d]}finally{r.stackRestore(i),a!==0&&r._OrtFree(a)}},Wa=e=>{let t=Te(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},ts=async(e,t)=>{var p,f,h,m;let r,i,a=Te();Array.isArray(e)?[r,i]=e:e.buffer===a.HEAPU8.buffer?[r,i]=[e.byteOffset,e.byteLength]:[r,i]=Wa(e);let n=0,s=0,o=0,u=[],l=[],d=[];try{if([s,u]=await Zi(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let q=[];for(let G of t.externalData){let ie=typeof G=="string"?G:G.path;q.push(Gr(typeof G=="string"?G:G.data).then(xe=>{a.mountExternalData(ie,xe)}))}await Promise.all(q)}for(let q of(t==null?void 0:t.executionProviders)??[])if((typeof q=="string"?q:q.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,typeof q!="string"){let G=q,ie=G==null?void 0:G.context,xe=G==null?void 0:G.gpuDevice,he=G==null?void 0:G.deviceType,$e=G==null?void 0:G.powerPreference;ie?a.currentContext=ie:xe?a.currentContext=await a.webnnCreateMLContext(xe):a.currentContext=await a.webnnCreateMLContext({deviceType:he,powerPreference:$e})}else a.currentContext=await a.webnnCreateMLContext();break}n=await a._OrtCreateSession(r,i,s),(p=a.webgpuOnCreateSession)==null||p.call(a,n),n===0&&ve("Can't create a session."),(f=a.jsepOnCreateSession)==null||f.call(a),a.currentContext&&(a.webnnRegisterMLContext(n,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[y,$]=Pp(n),w=!!(t!=null&&t.enableGraphCapture),_=[],S=[],x=[],z=[],P=[];for(let q=0;q<y;q++){let[G,ie,xe]=es(n,q);G===0&&ve("Can't get an input name."),l.push(G);let he=a.UTF8ToString(G);_.push(he),x.push(ie===0?{name:he,isTensor:!1}:{name:he,isTensor:!0,type:It(ie),shape:xe})}for(let q=0;q<$;q++){let[G,ie,xe]=es(n,q+y);G===0&&ve("Can't get an output name."),d.push(G);let he=a.UTF8ToString(G);S.push(he),z.push(ie===0?{name:he,isTensor:!1}:{name:he,isTensor:!0,type:It(ie),shape:xe});{if(w&&(t==null?void 0:t.preferredOutputLocation)===void 0){P.push("gpu-buffer");continue}let $e=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((h=t==null?void 0:t.preferredOutputLocation)==null?void 0:h[he])??"cpu",Fe=a.webnnIsGraphOutput;if($e==="cpu"&&Fe&&Fe(n,he)){P.push("ml-tensor-cpu-output");continue}if($e!=="cpu"&&$e!=="cpu-pinned"&&$e!=="gpu-buffer"&&$e!=="ml-tensor")throw new Error(`Not supported preferred output location: ${$e}.`);if(w&&$e!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${$e}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);P.push($e)}}let U=null;return P.some(q=>q==="gpu-buffer"||q==="ml-tensor"||q==="ml-tensor-cpu-output")&&(o=a._OrtCreateBinding(n),o===0&&ve("Can't create IO binding."),U={handle:o,outputPreferredLocations:P,outputPreferredLocationsEncoded:P.map(q=>q==="ml-tensor-cpu-output"?"ml-tensor":q).map(q=>di(q))}),br.set(n,[n,l,d,U,w,!1]),[n,_,S,x,z]}catch(y){throw l.forEach($=>a._OrtFree($)),d.forEach($=>a._OrtFree($)),o!==0&&a._OrtReleaseBinding(o)!==0&&ve("Can't release IO binding."),n!==0&&a._OrtReleaseSession(n)!==0&&ve("Can't release session."),y}finally{a._free(r),s!==0&&a._OrtReleaseSessionOptions(s)!==0&&ve("Can't release session options."),u.forEach(y=>a._free(y)),(m=a.unmountExternalData)==null||m.call(a)}},rs=e=>{var u,l,d;let t=Te(),r=br.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[i,a,n,s,o]=r;s&&(o&&t._OrtClearBoundOutputs(s.handle)!==0&&ve("Can't clear bound outputs."),t._OrtReleaseBinding(s.handle)!==0&&ve("Can't release IO binding.")),(u=t.jsepOnReleaseSession)==null||u.call(t,e),(l=t.webnnOnReleaseSession)==null||l.call(t,e),(d=t.webgpuOnReleaseSession)==null||d.call(t,e),a.forEach(p=>t._OrtFree(p)),n.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(i)!==0&&ve("Can't release session."),br.delete(e)},is=async(e,t,r,i,a,n,s=!1)=>{if(!e){t.push(0);return}let o=Te(),u=o.PTR_SIZE,l=e[0],d=e[1],p=e[3],f=p,h,m;if(l==="string"&&(p==="gpu-buffer"||p==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&p!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${n} when enableGraphCapture is true.`);if(p==="gpu-buffer"){let w=e[2].gpuBuffer;m=kt(Et(l),d);{let _=o.jsepRegisterBuffer;if(!_)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');h=_(i,n,w,m)}}else if(p==="ml-tensor"){let w=e[2].mlTensor;m=kt(Et(l),d);let _=o.webnnRegisterMLTensor;if(!_)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');h=_(i,w,Et(l),d)}else{let w=e[2];if(Array.isArray(w)){m=u*w.length,h=o._malloc(m),r.push(h);for(let _=0;_<w.length;_++){if(typeof w[_]!="string")throw new TypeError(`tensor data at index ${_} is not a string`);o.setValue(h+_*u,tt(w[_],r),"*")}}else{let _=o.webnnIsGraphInput,S=o.webnnIsGraphOutput;if(l!=="string"&&_&&S){let x=o.UTF8ToString(a);if(_(i,x)||S(i,x)){let z=Et(l);m=kt(z,d),f="ml-tensor";let P=o.webnnCreateTemporaryTensor,U=o.webnnUploadTensor;if(!P||!U)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let q=await P(i,z,d);U(q,new Uint8Array(w.buffer,w.byteOffset,w.byteLength)),h=q}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}}let y=o.stackSave(),$=o.stackAlloc(4*d.length);try{d.forEach((_,S)=>o.setValue($+S*u,_,u===4?"i32":"i64"));let w=o._OrtCreateTensor(Et(l),h,m,$,d.length,di(f));w===0&&ve(`Can't create tensor for input/output. session=${i}, index=${n}.`),t.push(w)}finally{o.stackRestore(y)}},as=async(e,t,r,i,a,n)=>{var xe,he,$e,Fe;let s=Te(),o=s.PTR_SIZE,u=br.get(e);if(!u)throw new Error(`cannot run inference. invalid session id: ${e}`);let l=u[0],d=u[1],p=u[2],f=u[3],h=u[4],m=u[5],y=t.length,$=i.length,w=0,_=[],S=[],x=[],z=[],P=s.stackSave(),U=s.stackAlloc(y*o),q=s.stackAlloc(y*o),G=s.stackAlloc($*o),ie=s.stackAlloc($*o);try{[w,_]=Wi(n);for(let ye=0;ye<y;ye++)await is(r[ye],S,z,e,d[t[ye]],t[ye],h);for(let ye=0;ye<$;ye++)await is(a[ye],x,z,e,p[i[ye]],y+i[ye],h);for(let ye=0;ye<y;ye++)s.setValue(U+ye*o,S[ye],"*"),s.setValue(q+ye*o,d[t[ye]],"*");for(let ye=0;ye<$;ye++)s.setValue(G+ye*o,x[ye],"*"),s.setValue(ie+ye*o,p[i[ye]],"*");if(f&&!m){let{handle:ye,outputPreferredLocations:Ee,outputPreferredLocationsEncoded:wt}=f;if(d.length!==y)throw new Error(`input count from feeds (${y}) is expected to be always equal to model's input count (${d.length}).`);for(let F=0;F<y;F++){let ae=t[F];await s._OrtBindInput(ye,d[ae],S[F])!==0&&ve(`Can't bind input[${F}] for session=${e}.`)}for(let F=0;F<$;F++){let ae=i[F];(xe=a[F])!=null&&xe[3]?s._OrtBindOutput(ye,p[ae],x[F],0)!==0&&ve(`Can't bind pre-allocated output[${F}] for session=${e}.`):s._OrtBindOutput(ye,p[ae],0,wt[ae])!==0&&ve(`Can't bind output[${F}] to ${Ee[F]} for session=${e}.`)}br.set(e,[l,d,p,f,h,!0])}(he=s.jsepOnRunStart)==null||he.call(s,l),($e=s.webnnOnRunStart)==null||$e.call(s,l);let Oe;f?Oe=await s._OrtRunWithBinding(l,f.handle,$,G,w):Oe=await s._OrtRun(l,q,U,y,ie,$,G,w),Oe!==0&&ve("failed to call OrtRun().");let we=[],Re=[];for(let ye=0;ye<$;ye++){let Ee=Number(s.getValue(G+ye*o,"*"));if(Ee===x[ye]){we.push(a[ye]);continue}let wt=s.stackSave(),F=s.stackAlloc(4*o),ae=!1,be,Be=0;try{s._OrtGetTensorData(Ee,F,F+o,F+2*o,F+3*o)!==0&&ve(`Can't access output tensor data on index ${ye}.`);let Dt=o===4?"i32":"i64",ki=Number(s.getValue(F,Dt));Be=s.getValue(F+o,"*");let Jp=s.getValue(F+o*2,"*"),kf=Number(s.getValue(F+o*3,Dt)),vr=[];for(let _t=0;_t<kf;_t++)vr.push(Number(s.getValue(Jp+_t*o,Dt)));s._OrtFree(Jp)!==0&&ve("Can't free memory for tensor dims.");let xr=vr.reduce((_t,st)=>_t*st,1);be=It(ki);let _a=f==null?void 0:f.outputPreferredLocations[i[ye]];if(be==="string"){if(_a==="gpu-buffer"||_a==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let _t=[];for(let st=0;st<xr;st++){let pr=s.getValue(Be+st*o,"*"),Cf=s.getValue(Be+(st+1)*o,"*"),zf=st===xr-1?void 0:Cf-pr;_t.push(s.UTF8ToString(pr,zf))}we.push([be,vr,_t,"cpu"])}else if(_a==="gpu-buffer"&&xr>0){let _t=s.jsepGetBuffer;if(!_t)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let st=_t(Be),pr=kt(ki,xr);if(pr===void 0||!Fr(be))throw new Error(`Unsupported data type: ${be}`);ae=!0,we.push([be,vr,{gpuBuffer:st,download:s.jsepCreateDownloader(st,pr,be),dispose:()=>{s._OrtReleaseTensor(Ee)!==0&&ve("Can't release tensor.")}},"gpu-buffer"])}else if(_a==="ml-tensor"&&xr>0){let _t=s.webnnEnsureTensor,st=s.webnnIsGraphInputOutputTypeSupported;if(!_t||!st)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(kt(ki,xr)===void 0||!Wr(be))throw new Error(`Unsupported data type: ${be}`);if(!st(e,be,!1))throw new Error(`preferredLocation "ml-tensor" for ${be} output is not supported by current WebNN Context.`);let pr=await _t(e,Be,ki,vr,!1);ae=!0,we.push([be,vr,{mlTensor:pr,download:s.webnnCreateMLTensorDownloader(Be,be),dispose:()=>{s.webnnReleaseTensorId(Be),s._OrtReleaseTensor(Ee)}},"ml-tensor"])}else if(_a==="ml-tensor-cpu-output"&&xr>0){let _t=s.webnnCreateMLTensorDownloader(Be,be)(),st=we.length;ae=!0,Re.push((async()=>{let pr=[st,await _t];return s.webnnReleaseTensorId(Be),s._OrtReleaseTensor(Ee),pr})()),we.push([be,vr,[],"cpu"])}else{let _t=qr(be),st=new _t(xr);new Uint8Array(st.buffer,st.byteOffset,st.byteLength).set(s.HEAPU8.subarray(Be,Be+st.byteLength)),we.push([be,vr,st,"cpu"])}}finally{s.stackRestore(wt),be==="string"&&Be&&s._free(Be),ae||s._OrtReleaseTensor(Ee)}}f&&!h&&(s._OrtClearBoundOutputs(f.handle)!==0&&ve("Can't clear bound outputs."),br.set(e,[l,d,p,f,h,!1]));for(let[ye,Ee]of await Promise.all(Re))we[ye][2]=Ee;return we}finally{(Fe=s.webnnOnRunEnd)==null||Fe.call(s,l),s.stackRestore(P),S.forEach(Oe=>s._OrtReleaseTensor(Oe)),x.forEach(Oe=>s._OrtReleaseTensor(Oe)),z.forEach(Oe=>s._free(Oe)),w!==0&&s._OrtReleaseRunOptions(w),_.forEach(Oe=>s._free(Oe))}},ns=e=>{let t=Te(),r=br.get(e);if(!r)throw new Error("invalid session id");let i=r[0],a=t._OrtEndProfiling(i);a===0&&ve("Can't get an profile file name."),t._OrtFree(a)},ss=e=>{let t=[];for(let r of e){let i=r[2];!Array.isArray(i)&&"buffer"in i&&t.push(i.buffer)}return t}}),$r,zt,Ii,ga,ya,Ga,os,ja,ai,ni,Np,Lp,qp,Vp,Fp,Wp,Gp,jp,Hp=T(()=>{ht(),Up(),Tt(),Dr(),$r=()=>!!K.wasm.proxy&&typeof document<"u",Ii=!1,ga=!1,ya=!1,ja=new Map,ai=(e,t)=>{let r=ja.get(e);r?r.push(t):ja.set(e,[t])},ni=()=>{if(Ii||!ga||ya||!zt)throw new Error("worker not ready")},Np=e=>{switch(e.data.type){case"init-wasm":Ii=!1,e.data.err?(ya=!0,os[1](e.data.err)):(ga=!0,os[0]()),Ga&&(URL.revokeObjectURL(Ga),Ga=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=ja.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Lp=async()=>{if(!ga){if(Ii)throw new Error("multiple calls to 'initWasm()' detected.");if(ya)throw new Error("previous call to 'initWasm()' failed.");if(Ii=!0,$r())return new Promise((e,t)=>{zt==null||zt.terminate(),Ni().then(([r,i])=>{try{zt=i,zt.onerror=n=>t(n),zt.onmessage=Np,os=[e,t];let a={type:"init-wasm",in:K};if(!a.in.wasm.wasmPaths&&r){let n=Or();n&&(a.in.wasm.wasmPaths=n)}zt.postMessage(a),Ga=r}catch(a){t(a)}},t)});try{await Nr(K.wasm),await Yn(K),ga=!0}catch(e){throw ya=!0,e}finally{Ii=!1}}},qp=async e=>{if($r())return ni(),new Promise((t,r)=>{ai("init-ep",[t,r]);let i={type:"init-ep",in:{epName:e,env:K}};zt.postMessage(i)});await Jn(K,e)},Vp=async e=>$r()?(ni(),new Promise((t,r)=>{ai("copy-from",[t,r]);let i={type:"copy-from",in:{buffer:e}};zt.postMessage(i,[e.buffer])})):Wa(e),Fp=async(e,t)=>{if($r()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return ni(),new Promise((r,i)=>{ai("create",[r,i]);let a={type:"create",in:{model:e,options:{...t}}},n=[];e instanceof Uint8Array&&n.push(e.buffer),zt.postMessage(a,n)})}else return ts(e,t)},Wp=async e=>{if($r())return ni(),new Promise((t,r)=>{ai("release",[t,r]);let i={type:"release",in:e};zt.postMessage(i)});rs(e)},Gp=async(e,t,r,i,a,n)=>{if($r()){if(r.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return ni(),new Promise((s,o)=>{ai("run",[s,o]);let u=r,l={type:"run",in:{sessionId:e,inputIndices:t,inputs:u,outputIndices:i,options:n}};zt.postMessage(l,ss(u))})}else return as(e,t,r,i,a,n)},jp=async e=>{if($r())return ni(),new Promise((t,r)=>{ai("end-profiling",[t,r]);let i={type:"end-profiling",in:e};zt.postMessage(i)});ns(e)}}),us,Kp,Zp,Sf=T(()=>{ht(),Hp(),Se(),Cr(),Qi(),us=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},Kp=e=>{switch(e[3]){case"cpu":return new qe(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Fr(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:i,dispose:a}=e[2];return qe.fromGpuBuffer(r,{dataType:t,dims:e[1],download:i,dispose:a})}case"ml-tensor":{let t=e[0];if(!Wr(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:i,dispose:a}=e[2];return qe.fromMLTensor(r,{dataType:t,dims:e[1],download:i,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},Zp=class{async fetchModelAndCopyToWasmMemory(e){return Vp(await Gr(e))}async loadModel(e,t){pt();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Fp(r,t),ut()}async dispose(){return Wp(this.sessionId)}async run(e,t,r){pt();let i=[],a=[];Object.entries(e).forEach(p=>{let f=p[0],h=p[1],m=this.inputNames.indexOf(f);if(m===-1)throw new Error(`invalid input '${f}'`);i.push(h),a.push(m)});let n=[],s=[];Object.entries(t).forEach(p=>{let f=p[0],h=p[1],m=this.outputNames.indexOf(f);if(m===-1)throw new Error(`invalid output '${f}'`);n.push(h),s.push(m)});let o=i.map((p,f)=>us(p,()=>`input "${this.inputNames[a[f]]}"`)),u=n.map((p,f)=>p?us(p,()=>`output "${this.outputNames[s[f]]}"`):null),l=await Gp(this.sessionId,a,o,s,u,r),d={};for(let p=0;p<l.length;p++)d[this.outputNames[s[p]]]=n[p]??Kp(l[p]);return ut(),d}startProfiling(){}endProfiling(){jp(this.sessionId)}}}),Qp={};ee(Qp,{OnnxruntimeWebAssemblyBackend:()=>ds,initializeFlags:()=>ls,wasmBackend:()=>Xp});var ls,ds,Xp,Tf=T(()=>{ht(),Hp(),Sf(),ls=()=>{(typeof K.wasm.initTimeout!="number"||K.wasm.initTimeout<0)&&(K.wasm.initTimeout=0);let e=K.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),K.wasm.simd=!1),typeof K.wasm.proxy!="boolean"&&(K.wasm.proxy=!1),typeof K.wasm.trace!="boolean"&&(K.wasm.trace=!1),typeof K.wasm.numThreads!="number"||!Number.isInteger(K.wasm.numThreads)||K.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)K.wasm.numThreads=1;else{let t=typeof navigator>"u"?Z("node:os").cpus().length:navigator.hardwareConcurrency;K.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},ds=class{async init(e){ls(),await Lp(),await qp(e)}async createInferenceSessionHandler(e,t){let r=new Zp;return await r.loadModel(e,t),r}},Xp=new ds}),Yp={};ee(Yp,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>qe,default:()=>If,env:()=>K,registerBackend:()=>le}),ht(),ht(),ht();var Ef="1.22.0",If=Ai;{let e=(Tf(),de(Qp)).wasmBackend;le("webgpu",e,5),le("webnn",e,5),le("cpu",e,10),le("wasm",e,10)}return Object.defineProperty(K.versions,"web",{value:Ef,enumerable:!0}),de(Yp)})();/**
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
 */I.exports=Y})(fs)),fs.exports}var si={},hs={},dc;function Qf(){return dc||(dc=1,Object.defineProperty(hs,"__esModule",{value:!0})),hs}var xa={},pc;function Xf(){if(pc)return xa;pc=1;var I;Object.defineProperty(xa,"__esModule",{value:!0}),xa.SileroLegacy=void 0;const M=ka();class Y{constructor(L,H,re,Z,T){this.ortInstance=L,this._session=H,this._h=re,this._c=Z,this._sr=T,this.reset_state=()=>{const ee=Array(128).fill(0);this._h=new this.ortInstance.Tensor("float32",ee,[2,1,64]),this._c=new this.ortInstance.Tensor("float32",ee,[2,1,64])},this.process=async ee=>{var ne;const de={input:new this.ortInstance.Tensor("float32",ee,[1,ee.length]),h:this._h,c:this._c,sr:this._sr},ue=await this._session.run(de);this._h=ue.hn,this._c=ue.cn;const[pe]=(ne=ue.output)==null?void 0:ne.data;return{notSpeech:1-pe,isSpeech:pe}},this.release=async()=>{await this._session.release(),this._h.dispose(),this._c.dispose(),this._sr.dispose()}}}return xa.SileroLegacy=Y,I=Y,Y.new=async(te,L)=>{M.log.debug("initializing vad");const H=await L(),re=await te.InferenceSession.create(H),Z=new te.Tensor("int64",[16000n]),T=Array(128).fill(0),ee=new te.Tensor("float32",T,[2,1,64]),me=new te.Tensor("float32",T,[2,1,64]);return M.log.debug("vad is initialized"),new I(te,re,ee,me,Z)},xa}var Sa={},cc;function Yf(){if(cc)return Sa;cc=1;var I;Object.defineProperty(Sa,"__esModule",{value:!0}),Sa.SileroV5=void 0;const M=ka();function Y(L){const H=Array(256).fill(0);return new L.Tensor("float32",H,[2,1,128])}class te{constructor(H,re,Z,T){this._session=H,this._state=re,this._sr=Z,this.ortInstance=T,this.reset_state=()=>{this._state=Y(this.ortInstance)},this.process=async ee=>{var ne;const de={input:new this.ortInstance.Tensor("float32",ee,[1,ee.length]),state:this._state,sr:this._sr},ue=await this._session.run(de);if(!ue.stateN)throw new Error("No state from model");if(this._state=ue.stateN,!((ne=ue.output)!=null&&ne.data))throw new Error("No output from model");const pe=ue.output.data[0];if(typeof pe!="number")throw new Error("Weird output data");return{notSpeech:1-pe,isSpeech:pe}},this.release=async()=>{await this._session.release(),this._state.dispose(),this._sr.dispose()}}}return Sa.SileroV5=te,I=te,te.new=async(L,H)=>{M.log.debug("Loading VAD...");const re=await H(),Z=await L.InferenceSession.create(re),T=new L.Tensor("int64",[16000n]),ee=Y(L);return M.log.debug("...finished loading VAD"),new I(Z,ee,T,L)},Sa}var fc;function kc(){return fc||(fc=1,(function(I){var M=si&&si.__createBinding||(Object.create?(function(H,re,Z,T){T===void 0&&(T=Z);var ee=Object.getOwnPropertyDescriptor(re,Z);(!ee||("get"in ee?!re.__esModule:ee.writable||ee.configurable))&&(ee={enumerable:!0,get:function(){return re[Z]}}),Object.defineProperty(H,T,ee)}):(function(H,re,Z,T){T===void 0&&(T=Z),H[T]=re[Z]})),Y=si&&si.__exportStar||function(H,re){for(var Z in H)Z!=="default"&&!Object.prototype.hasOwnProperty.call(re,Z)&&M(re,H,Z)};Object.defineProperty(I,"__esModule",{value:!0}),I.SileroV5=I.SileroLegacy=void 0,Y(Qf(),I);var te=Xf();Object.defineProperty(I,"SileroLegacy",{enumerable:!0,get:function(){return te.SileroLegacy}});var L=Yf();Object.defineProperty(I,"SileroV5",{enumerable:!0,get:function(){return L.SileroV5}})})(si)),si}var Ta={},hc;function Cc(){if(hc)return Ta;hc=1,Object.defineProperty(Ta,"__esModule",{value:!0}),Ta.Resampler=void 0;const I=ka();class M{constructor(te){this.options=te,this.process=L=>{const H=[];for(const re of L)for(this.inputBuffer.push(re);this.hasEnoughDataForFrame();){const Z=this.generateOutputFrame();H.push(Z)}return H},te.nativeSampleRate<16e3&&I.log.error("nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"),this.inputBuffer=[]}async*stream(te){for(const L of te)for(this.inputBuffer.push(L);this.hasEnoughDataForFrame();)yield this.generateOutputFrame()}hasEnoughDataForFrame(){return this.inputBuffer.length*this.options.targetSampleRate/this.options.nativeSampleRate>=this.options.targetFrameSize}generateOutputFrame(){const te=new Float32Array(this.options.targetFrameSize);let L=0,H=0;for(;L<this.options.targetFrameSize;){let re=0,Z=0;for(;H<Math.min(this.inputBuffer.length,(L+1)*this.options.nativeSampleRate/this.options.targetSampleRate);){const T=this.inputBuffer[H];T!==void 0&&(re+=T,Z++),H++}te[L]=re/Z,L++}return this.inputBuffer=this.inputBuffer.slice(H),te}}return Ta.Resampler=M,Ta}var mc;function Jf(){return mc||(mc=1,(function(I){var M=fr&&fr.__createBinding||(Object.create?(function(ue,pe,le,ne){ne===void 0&&(ne=le);var ke=Object.getOwnPropertyDescriptor(pe,le);(!ke||("get"in ke?!pe.__esModule:ke.writable||ke.configurable))&&(ke={enumerable:!0,get:function(){return pe[le]}}),Object.defineProperty(ue,ne,ke)}):(function(ue,pe,le,ne){ne===void 0&&(ne=le),ue[ne]=pe[le]})),Y=fr&&fr.__setModuleDefault||(Object.create?(function(ue,pe){Object.defineProperty(ue,"default",{enumerable:!0,value:pe})}):function(ue,pe){ue.default=pe}),te=fr&&fr.__importStar||function(ue){if(ue&&ue.__esModule)return ue;var pe={};if(ue!=null)for(var le in ue)le!=="default"&&Object.prototype.hasOwnProperty.call(ue,le)&&M(pe,ue,le);return Y(pe,ue),pe};Object.defineProperty(I,"__esModule",{value:!0}),I.NonRealTimeVAD=I.defaultNonRealTimeVADOptions=void 0;const L=te(Zf()),H=Tc(),re=ws(),Z=bs(),T=Za(),ee=kc(),me=Cc();I.defaultNonRealTimeVADOptions={...Z.defaultFrameProcessorOptions,modelURL:H.baseAssetPath+"silero_vad_legacy.onnx",modelFetcher:re.defaultModelFetcher};class de{static async new(pe={}){const le={...I.defaultNonRealTimeVADOptions,...pe};(0,Z.validateOptions)(le),le.ortConfig!==void 0&&le.ortConfig(L);const ne=()=>le.modelFetcher(le.modelURL),ke=await ee.SileroLegacy.new(L,ne),Me=new Z.FrameProcessor(ke.process,ke.reset_state,{positiveSpeechThreshold:le.positiveSpeechThreshold,negativeSpeechThreshold:le.negativeSpeechThreshold,redemptionMs:le.redemptionMs,preSpeechPadMs:le.preSpeechPadMs,minSpeechMs:le.minSpeechMs,submitUserSpeechOnPause:le.submitUserSpeechOnPause},1536/16);return Me.resume(),new this(ne,L,le,Me)}constructor(pe,le,ne,ke){this.modelFetcher=pe,this.ort=le,this.options=ne,this.frameProcessor=ke,this.frameSamples=1536}async*run(pe,le){const ne={nativeSampleRate:le,targetSampleRate:16e3,targetFrameSize:this.frameSamples},ke=new me.Resampler(ne);let Me=0,Ie=0,Q=0;for await(const oe of ke.stream(pe)){const N=[];await this.frameProcessor.process(oe,se=>{N.push(se)});for(const se of N)switch(se.msg){case T.Message.SpeechStart:Me=Q*this.frameSamples/16;break;case T.Message.SpeechEnd:Ie=(Q+1)*this.frameSamples/16,yield{audio:se.audio,start:Me,end:Ie};break}Q++}const fe=[];this.frameProcessor.endSegment(oe=>{fe.push(oe)});for(const oe of fe)switch(oe.msg){case T.Message.SpeechEnd:yield{audio:oe.audio,start:Me,end:Q*this.frameSamples/16}}}}I.NonRealTimeVAD=de})(fr)),fr}var Yt={},gc;function eh(){if(gc)return Yt;gc=1,Object.defineProperty(Yt,"__esModule",{value:!0}),Yt.audioFileToArray=Yt.encodeWAV=Yt.arrayBufferToBase64=Yt.minFramesForTargetMS=void 0;function I(Z,T,ee=16e3){return Math.ceil(Z*ee/1e3/T)}Yt.minFramesForTargetMS=I;function M(Z){const T=new Uint8Array(Z),ee=T.byteLength,me=new Array(ee);for(let de=0;de<ee;de++){const ue=T[de];if(ue===void 0)break;me[de]=String.fromCharCode(ue)}return btoa(me.join(""))}Yt.arrayBufferToBase64=M;function Y(Z,T=3,ee=16e3,me=1,de=32){const ue=de/8,pe=me*ue,le=new ArrayBuffer(44+Z.length*ue),ne=new DataView(le);return H(ne,0,"RIFF"),ne.setUint32(4,36+Z.length*ue,!0),H(ne,8,"WAVE"),H(ne,12,"fmt "),ne.setUint32(16,16,!0),ne.setUint16(20,T,!0),ne.setUint16(22,me,!0),ne.setUint32(24,ee,!0),ne.setUint32(28,ee*pe,!0),ne.setUint16(32,pe,!0),ne.setUint16(34,de,!0),H(ne,36,"data"),ne.setUint32(40,Z.length*ue,!0),T===1?L(ne,44,Z):te(ne,44,Z),le}Yt.encodeWAV=Y;function te(Z,T,ee){for(let me=0;me<ee.length;me++,T+=4)Z.setFloat32(T,ee[me],!0)}function L(Z,T,ee){for(let me=0;me<ee.length;me++,T+=2){const de=Math.max(-1,Math.min(1,ee[me]));Z.setInt16(T,de<0?de*32768:de*32767,!0)}}function H(Z,T,ee){for(let me=0;me<ee.length;me++)Z.setUint8(T+me,ee.charCodeAt(me))}async function re(Z){const T=new OfflineAudioContext(1,1,44100),ee=new FileReader;let me=null;if(await new Promise(pe=>{ee.addEventListener("loadend",()=>{const le=ee.result;T.decodeAudioData(le,ne=>{me=ne,T.startRendering().then(()=>{console.log("Rendering completed successfully"),pe()}).catch(ke=>{console.error("Rendering failed: ",ke)})},ne=>{console.log("Error with decoding audio data: ",ne)})}),ee.readAsArrayBuffer(Z)}),me===null)throw Error("some shit");const de=me,ue=new Float32Array(de.length);for(let pe=0;pe<de.length;pe++)for(let le=0;le<de.numberOfChannels;le++){const ne=de.getChannelData(le)[pe],ke=ue[pe];if(ne===void 0||ke===void 0)throw new Error("sample or out[i] is undefined");ue[pe]=ke+ne}return{audio:ue,sampleRate:de.sampleRate}}return Yt.audioFileToArray=re,Yt}var hr={},ms={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */var yc;function th(){return yc||(yc=1,(function(I,M){var Y=(()=>{var te=Object.defineProperty,L=Object.getOwnPropertyDescriptor,H=Object.getOwnPropertyNames,re=Object.prototype.hasOwnProperty,Z=(c=>typeof Ut<"u"?Ut:typeof Proxy<"u"?new Proxy(c,{get:(g,b)=>(typeof Ut<"u"?Ut:g)[b]}):c)(function(c){if(typeof Ut<"u")return Ut.apply(this,arguments);throw Error('Dynamic require of "'+c+'" is not supported')}),T=(c,g)=>()=>(c&&(g=c(c=0)),g),ee=(c,g)=>{for(var b in g)te(c,b,{get:g[b],enumerable:!0})},me=(c,g,b,E)=>{if(g&&typeof g=="object"||typeof g=="function")for(let v of H(g))!re.call(c,v)&&v!==b&&te(c,v,{get:()=>g[v],enumerable:!(E=L(g,v))||E.enumerable});return c},de=c=>me(te({},"__esModule",{value:!0}),c),ue,pe,le,ne,ke,Me=T(()=>{ue=new Map,pe=[],le=(c,g,b)=>{if(g&&typeof g.init=="function"&&typeof g.createInferenceSessionHandler=="function"){let E=ue.get(c);if(E===void 0)ue.set(c,{backend:g,priority:b});else{if(E.priority>b)return;if(E.priority===b&&E.backend!==g)throw new Error(`cannot register backend "${c}" using priority ${b}`)}if(b>=0){let v=pe.indexOf(c);v!==-1&&pe.splice(v,1);for(let O=0;O<pe.length;O++)if(ue.get(pe[O]).priority<=b){pe.splice(O,0,c);return}pe.push(c)}return}throw new TypeError("not a valid backend")},ne=async c=>{let g=ue.get(c);if(!g)return"backend not found.";if(g.initialized)return g.backend;if(g.aborted)return g.error;{let b=!!g.initPromise;try{return b||(g.initPromise=g.backend.init(c)),await g.initPromise,g.initialized=!0,g.backend}catch(E){return b||(g.error=`${E}`,g.aborted=!0),g.error}finally{delete g.initPromise}}},ke=async c=>{let g=c.executionProviders||[],b=g.map(R=>typeof R=="string"?R:R.name),E=b.length===0?pe:b,v,O=[],C=new Set;for(let R of E){let V=await ne(R);typeof V=="string"?O.push({name:R,err:V}):(v||(v=V),v===V&&C.add(R))}if(!v)throw new Error(`no available backend found. ERR: ${O.map(R=>`[${R.name}] ${R.err}`).join(", ")}`);for(let{name:R,err:V}of O)b.includes(R)&&console.warn(`removing requested execution provider "${R}" from session options because it is not available: ${V}`);let k=g.filter(R=>C.has(typeof R=="string"?R:R.name));return[v,new Proxy(c,{get:(R,V)=>V==="executionProviders"?k:Reflect.get(R,V)})]}}),Ie=T(()=>{Me()}),Q,fe=T(()=>{Q="1.22.0"}),oe,N,se=T(()=>{fe(),oe="warning",N={wasm:{},webgl:{},webgpu:{},versions:{common:Q},set logLevel(c){if(c!==void 0){if(typeof c!="string"||["verbose","info","warning","error","fatal"].indexOf(c)===-1)throw new Error(`Unsupported logging level: ${c}`);oe=c}},get logLevel(){return oe}},Object.defineProperty(N,"logLevel",{enumerable:!0})}),K,Ue=T(()=>{se(),K=N}),Ae,Le,ot=T(()=>{Ae=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);b.width=c.dims[3],b.height=c.dims[2];let E=b.getContext("2d");if(E!=null){let v,O;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(v=c.dims[2],O=c.dims[3]):(v=c.dims[3],O=c.dims[2]);let C=(g==null?void 0:g.format)!==void 0?g.format:"RGB",k=g==null?void 0:g.norm,R,V;k===void 0||k.mean===void 0?R=[255,255,255,255]:typeof k.mean=="number"?R=[k.mean,k.mean,k.mean,k.mean]:(R=[k.mean[0],k.mean[1],k.mean[2],0],k.mean[3]!==void 0&&(R[3]=k.mean[3])),k===void 0||k.bias===void 0?V=[0,0,0,0]:typeof k.bias=="number"?V=[k.bias,k.bias,k.bias,k.bias]:(V=[k.bias[0],k.bias[1],k.bias[2],0],k.bias[3]!==void 0&&(V[3]=k.bias[3]));let W=O*v,j=0,B=W,ce=W*2,A=-1;C==="RGBA"?(j=0,B=W,ce=W*2,A=W*3):C==="RGB"?(j=0,B=W,ce=W*2):C==="RBG"&&(j=0,ce=W,B=W*2);for(let X=0;X<O;X++)for(let Je=0;Je<v;Je++){let ze=(c.data[j++]-V[0])*R[0],Ce=(c.data[B++]-V[1])*R[1],Ze=(c.data[ce++]-V[2])*R[2],ge=A===-1?255:(c.data[A++]-V[3])*R[3];E.fillStyle="rgba("+ze+","+Ce+","+Ze+","+ge+")",E.fillRect(Je,X,1,1)}if("toDataURL"in b)return b.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Le=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),E;if(b!=null){let v,O,C;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(v=c.dims[2],O=c.dims[1],C=c.dims[3]):(v=c.dims[3],O=c.dims[2],C=c.dims[1]);let k=g!==void 0&&g.format!==void 0?g.format:"RGB",R=g==null?void 0:g.norm,V,W;R===void 0||R.mean===void 0?V=[255,255,255,255]:typeof R.mean=="number"?V=[R.mean,R.mean,R.mean,R.mean]:(V=[R.mean[0],R.mean[1],R.mean[2],255],R.mean[3]!==void 0&&(V[3]=R.mean[3])),R===void 0||R.bias===void 0?W=[0,0,0,0]:typeof R.bias=="number"?W=[R.bias,R.bias,R.bias,R.bias]:(W=[R.bias[0],R.bias[1],R.bias[2],0],R.bias[3]!==void 0&&(W[3]=R.bias[3]));let j=O*v;if(g!==void 0&&(g.format!==void 0&&C===4&&g.format!=="RGBA"||C===3&&g.format!=="RGB"&&g.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let B=4,ce=0,A=1,X=2,Je=3,ze=0,Ce=j,Ze=j*2,ge=-1;k==="RGBA"?(ze=0,Ce=j,Ze=j*2,ge=j*3):k==="RGB"?(ze=0,Ce=j,Ze=j*2):k==="RBG"&&(ze=0,Ze=j,Ce=j*2),E=b.createImageData(v,O);for(let Xe=0;Xe<O*v;ce+=B,A+=B,X+=B,Je+=B,Xe++)E.data[ce]=(c.data[ze++]-W[0])*V[0],E.data[A]=(c.data[Ce++]-W[1])*V[1],E.data[X]=(c.data[Ze++]-W[2])*V[2],E.data[Je]=ge===-1?255:(c.data[ge++]-W[3])*V[3]}else throw new Error("Can not access image data");return E}}),We,Ke,At,Ot,je,ft,nr=T(()=>{Pe(),We=(c,g)=>{if(c===void 0)throw new Error("Image buffer must be defined");if(g.height===void 0||g.width===void 0)throw new Error("Image height and width must be defined");if(g.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:b,width:E}=g,v=g.norm??{mean:255,bias:0},O,C;typeof v.mean=="number"?O=[v.mean,v.mean,v.mean,v.mean]:O=[v.mean[0],v.mean[1],v.mean[2],v.mean[3]??255],typeof v.bias=="number"?C=[v.bias,v.bias,v.bias,v.bias]:C=[v.bias[0],v.bias[1],v.bias[2],v.bias[3]??0];let k=g.format!==void 0?g.format:"RGBA",R=g.tensorFormat!==void 0&&g.tensorFormat!==void 0?g.tensorFormat:"RGB",V=b*E,W=R==="RGBA"?new Float32Array(V*4):new Float32Array(V*3),j=4,B=0,ce=1,A=2,X=3,Je=0,ze=V,Ce=V*2,Ze=-1;k==="RGB"&&(j=3,B=0,ce=1,A=2,X=-1),R==="RGBA"?Ze=V*3:R==="RBG"?(Je=0,Ce=V,ze=V*2):R==="BGR"&&(Ce=0,ze=V,Je=V*2);for(let ge=0;ge<V;ge++,B+=j,A+=j,ce+=j,X+=j)W[Je++]=(c[B]+C[0])/O[0],W[ze++]=(c[ce]+C[1])/O[1],W[Ce++]=(c[A]+C[2])/O[2],Ze!==-1&&X!==-1&&(W[Ze++]=(c[X]+C[3])/O[3]);return R==="RGBA"?new He("float32",W,[1,4,b,E]):new He("float32",W,[1,3,b,E])},Ke=async(c,g)=>{let b=typeof HTMLImageElement<"u"&&c instanceof HTMLImageElement,E=typeof ImageData<"u"&&c instanceof ImageData,v=typeof ImageBitmap<"u"&&c instanceof ImageBitmap,O=typeof c=="string",C,k=g??{},R=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},V=W=>typeof HTMLCanvasElement<"u"&&W instanceof HTMLCanvasElement||W instanceof OffscreenCanvas?W.getContext("2d"):null;if(b){let W=R();W.width=c.width,W.height=c.height;let j=V(W);if(j!=null){let B=c.height,ce=c.width;if(g!==void 0&&g.resizedHeight!==void 0&&g.resizedWidth!==void 0&&(B=g.resizedHeight,ce=g.resizedWidth),g!==void 0){if(k=g,g.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");k.tensorFormat="RGBA",k.height=B,k.width=ce}else k.tensorFormat="RGBA",k.height=B,k.width=ce;j.drawImage(c,0,0),C=j.getImageData(0,0,ce,B).data}else throw new Error("Can not access image data")}else if(E){let W,j;if(g!==void 0&&g.resizedWidth!==void 0&&g.resizedHeight!==void 0?(W=g.resizedHeight,j=g.resizedWidth):(W=c.height,j=c.width),g!==void 0&&(k=g),k.format="RGBA",k.height=W,k.width=j,g!==void 0){let B=R();B.width=j,B.height=W;let ce=V(B);if(ce!=null)ce.putImageData(c,0,0),C=ce.getImageData(0,0,j,W).data;else throw new Error("Can not access image data")}else C=c.data}else if(v){if(g===void 0)throw new Error("Please provide image config with format for Imagebitmap");let W=R();W.width=c.width,W.height=c.height;let j=V(W);if(j!=null){let B=c.height,ce=c.width;return j.drawImage(c,0,0,ce,B),C=j.getImageData(0,0,ce,B).data,k.height=B,k.width=ce,We(C,k)}else throw new Error("Can not access image data")}else{if(O)return new Promise((W,j)=>{let B=R(),ce=V(B);if(!c||!ce)return j();let A=new Image;A.crossOrigin="Anonymous",A.src=c,A.onload=()=>{B.width=A.width,B.height=A.height,ce.drawImage(A,0,0,B.width,B.height);let X=ce.getImageData(0,0,B.width,B.height);k.height=B.height,k.width=B.width,W(We(X.data,k))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(C!==void 0)return We(C,k);throw new Error("Input data provided is not supported - aborted tensor creation")},At=(c,g)=>{let{width:b,height:E,download:v,dispose:O}=g,C=[1,E,b,4];return new He({location:"texture",type:"float32",texture:c,dims:C,download:v,dispose:O})},Ot=(c,g)=>{let{dataType:b,dims:E,download:v,dispose:O}=g;return new He({location:"gpu-buffer",type:b??"float32",gpuBuffer:c,dims:E,download:v,dispose:O})},je=(c,g)=>{let{dataType:b,dims:E,download:v,dispose:O}=g;return new He({location:"ml-tensor",type:b??"float32",mlTensor:c,dims:E,download:v,dispose:O})},ft=(c,g,b)=>new He({location:"cpu-pinned",type:c,data:g,dims:b??[g.length]})}),it,J,Ye,vt,Nt=T(()=>{it=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),J=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Ye=!1,vt=()=>{if(!Ye){Ye=!0;let c=typeof BigInt64Array<"u"&&BigInt64Array.from,g=typeof BigUint64Array<"u"&&BigUint64Array.from,b=globalThis.Float16Array,E=typeof b<"u"&&b.from;c&&(it.set("int64",BigInt64Array),J.set(BigInt64Array,"int64")),g&&(it.set("uint64",BigUint64Array),J.set(BigUint64Array,"uint64")),E?(it.set("float16",b),J.set(b,"float16")):it.set("float16",Uint16Array)}}}),Tr,Er,li=T(()=>{Pe(),Tr=c=>{let g=1;for(let b=0;b<c.length;b++){let E=c[b];if(typeof E!="number"||!Number.isSafeInteger(E))throw new TypeError(`dims[${b}] must be an integer, got: ${E}`);if(E<0)throw new RangeError(`dims[${b}] must be a non-negative integer, got: ${E}`);g*=E}return g},Er=(c,g)=>{switch(c.location){case"cpu":return new He(c.type,c.data,g);case"cpu-pinned":return new He({location:"cpu-pinned",data:c.data,type:c.type,dims:g});case"texture":return new He({location:"texture",texture:c.texture,type:c.type,dims:g});case"gpu-buffer":return new He({location:"gpu-buffer",gpuBuffer:c.gpuBuffer,type:c.type,dims:g});case"ml-tensor":return new He({location:"ml-tensor",mlTensor:c.mlTensor,type:c.type,dims:g});default:throw new Error(`tensorReshape: tensor location ${c.location} is not supported`)}}}),He,Pe=T(()=>{ot(),nr(),Nt(),li(),He=class{constructor(c,g,b){vt();let E,v;if(typeof c=="object"&&"location"in c)switch(this.dataLocation=c.location,E=c.type,v=c.dims,c.location){case"cpu-pinned":{let C=it.get(E);if(!C)throw new TypeError(`unsupported type "${E}" to create tensor from pinned buffer`);if(!(c.data instanceof C))throw new TypeError(`buffer should be of type ${C.name}`);this.cpuData=c.data;break}case"texture":{if(E!=="float32")throw new TypeError(`unsupported type "${E}" to create tensor from texture`);this.gpuTextureData=c.texture,this.downloader=c.download,this.disposer=c.dispose;break}case"gpu-buffer":{if(E!=="float32"&&E!=="float16"&&E!=="int32"&&E!=="int64"&&E!=="uint32"&&E!=="uint8"&&E!=="bool"&&E!=="uint4"&&E!=="int4")throw new TypeError(`unsupported type "${E}" to create tensor from gpu buffer`);this.gpuBufferData=c.gpuBuffer,this.downloader=c.download,this.disposer=c.dispose;break}case"ml-tensor":{if(E!=="float32"&&E!=="float16"&&E!=="int32"&&E!=="int64"&&E!=="uint32"&&E!=="uint64"&&E!=="int8"&&E!=="uint8"&&E!=="bool"&&E!=="uint4"&&E!=="int4")throw new TypeError(`unsupported type "${E}" to create tensor from MLTensor`);this.mlTensorData=c.mlTensor,this.downloader=c.download,this.disposer=c.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let C,k;if(typeof c=="string")if(E=c,k=b,c==="string"){if(!Array.isArray(g))throw new TypeError("A string tensor's data must be a string array.");C=g}else{let R=it.get(c);if(R===void 0)throw new TypeError(`Unsupported tensor type: ${c}.`);if(Array.isArray(g)){if(c==="float16"&&R===Uint16Array||c==="uint4"||c==="int4")throw new TypeError(`Creating a ${c} tensor from number array is not supported. Please use ${R.name} as data.`);c==="uint64"||c==="int64"?C=R.from(g,BigInt):C=R.from(g)}else if(g instanceof R)C=g;else if(g instanceof Uint8ClampedArray)if(c==="uint8")C=Uint8Array.from(g);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(c==="float16"&&g instanceof Uint16Array&&R!==Uint16Array)C=new globalThis.Float16Array(g.buffer,g.byteOffset,g.length);else throw new TypeError(`A ${E} tensor's data must be type of ${R}`)}else if(k=g,Array.isArray(c)){if(c.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let R=typeof c[0];if(R==="string")E="string",C=c;else if(R==="boolean")E="bool",C=Uint8Array.from(c);else throw new TypeError(`Invalid element type of data array: ${R}.`)}else if(c instanceof Uint8ClampedArray)E="uint8",C=Uint8Array.from(c);else{let R=J.get(c.constructor);if(R===void 0)throw new TypeError(`Unsupported type for tensor data: ${c.constructor}.`);E=R,C=c}if(k===void 0)k=[C.length];else if(!Array.isArray(k))throw new TypeError("A tensor's dims must be a number array");v=k,this.cpuData=C,this.dataLocation="cpu"}let O=Tr(v);if(this.cpuData&&O!==this.cpuData.length&&!((E==="uint4"||E==="int4")&&Math.ceil(O/2)===this.cpuData.length))throw new Error(`Tensor's size(${O}) does not match data length(${this.cpuData.length}).`);this.type=E,this.dims=v,this.size=O}static async fromImage(c,g){return Ke(c,g)}static fromTexture(c,g){return At(c,g)}static fromGpuBuffer(c,g){return Ot(c,g)}static fromMLTensor(c,g){return je(c,g)}static fromPinnedBuffer(c,g,b){return ft(c,g,b)}toDataURL(c){return Ae(this,c)}toImageData(c){return Le(this,c)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(c){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let g=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=g,c&&this.disposer&&(this.disposer(),this.disposer=void 0),g}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(c){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Er(this,c)}}}),qe,Rt=T(()=>{Pe(),qe=He}),dt,Ir,pt,ut,Ci=T(()=>{se(),dt=(c,g)=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||console.timeStamp(`${c}::ORT::${g}`)},Ir=(c,g)=>{var v;let b=((v=new Error().stack)==null?void 0:v.split(/\r\n|\r|\n/g))||[],E=!1;for(let O=0;O<b.length;O++){if(E&&!b[O].includes("TRACE_FUNC")){let C=`FUNC_${c}::${b[O].trim().split(" ")[1]}`;g&&(C+=`::${g}`),dt("CPU",C);return}b[O].includes("TRACE_FUNC")&&(E=!0)}},pt=c=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||Ir("BEGIN",c)},ut=c=>{(typeof N.trace>"u"?!N.wasm.trace:!N.trace)||Ir("END",c)}}),zi,Qa=T(()=>{Me(),Rt(),Ci(),zi=class zc{constructor(g){this.handler=g}async run(g,b,E){pt();let v={},O={};if(typeof g!="object"||g===null||g instanceof qe||Array.isArray(g))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let C=!0;if(typeof b=="object"){if(b===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(b instanceof qe)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(b)){if(b.length===0)throw new TypeError("'fetches' cannot be an empty array.");C=!1;for(let V of b){if(typeof V!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(V)===-1)throw new RangeError(`'fetches' contains invalid output name: ${V}.`);v[V]=null}if(typeof E=="object"&&E!==null)O=E;else if(typeof E<"u")throw new TypeError("'options' must be an object.")}else{let V=!1,W=Object.getOwnPropertyNames(b);for(let j of this.outputNames)if(W.indexOf(j)!==-1){let B=b[j];(B===null||B instanceof qe)&&(V=!0,C=!1,v[j]=B)}if(V){if(typeof E=="object"&&E!==null)O=E;else if(typeof E<"u")throw new TypeError("'options' must be an object.")}else O=b}}else if(typeof b<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let V of this.inputNames)if(typeof g[V]>"u")throw new Error(`input '${V}' is missing in 'feeds'.`);if(C)for(let V of this.outputNames)v[V]=null;let k=await this.handler.run(g,v,O),R={};for(let V in k)if(Object.hasOwnProperty.call(k,V)){let W=k[V];W instanceof qe?R[V]=W:R[V]=new qe(W.type,W.data,W.dims)}return ut(),R}async release(){return this.handler.dispose()}static async create(g,b,E,v){pt();let O,C={};if(typeof g=="string"){if(O=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof Uint8Array){if(O=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&g instanceof SharedArrayBuffer){let W=g,j=0,B=g.byteLength;if(typeof b=="object"&&b!==null)C=b;else if(typeof b=="number"){if(j=b,!Number.isSafeInteger(j))throw new RangeError("'byteOffset' must be an integer.");if(j<0||j>=W.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${W.byteLength}).`);if(B=g.byteLength-j,typeof E=="number"){if(B=E,!Number.isSafeInteger(B))throw new RangeError("'byteLength' must be an integer.");if(B<=0||j+B>W.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${W.byteLength-j}].`);if(typeof v=="object"&&v!==null)C=v;else if(typeof v<"u")throw new TypeError("'options' must be an object.")}else if(typeof E<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof b<"u")throw new TypeError("'options' must be an object.");O=new Uint8Array(W,j,B)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[k,R]=await ke(C),V=await k.createInferenceSessionHandler(O,R);return ut(),new zc(V)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Xa=T(()=>{Qa(),kr=zi}),Ya=T(()=>{}),Ja=T(()=>{}),en=T(()=>{}),tn=T(()=>{}),Ai={};ee(Ai,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>qe,env:()=>K,registerBackend:()=>le});var ht=T(()=>{Ie(),Ue(),Xa(),Rt(),Ya(),Ja(),Ci(),en(),tn()}),Cr=T(()=>{}),Oi={};ee(Oi,{default:()=>Ri});var zr,Ar,Ri,rn=T(()=>{var c;Yi(),Tt(),Dr(),zr="ort-wasm-proxy-worker",Ar=((c=globalThis.self)==null?void 0:c.name)===zr,Ar&&(self.onmessage=g=>{let{type:b,in:E}=g.data;try{switch(b){case"init-wasm":Nr(E.wasm).then(()=>{pi(E).then(()=>{postMessage({type:b})},v=>{postMessage({type:b,err:v})})},v=>{postMessage({type:b,err:v})});break;case"init-ep":{let{epName:v,env:O}=E;ci(O,v).then(()=>{postMessage({type:b})},C=>{postMessage({type:b,err:C})});break}case"copy-from":{let{buffer:v}=E,O=De(v);postMessage({type:b,out:O});break}case"create":{let{model:v,options:O}=E;Mt(v,O).then(C=>{postMessage({type:b,out:C})},C=>{postMessage({type:b,err:C})});break}case"release":mi(E),postMessage({type:b});break;case"run":{let{sessionId:v,inputIndices:O,inputs:C,outputIndices:k,options:R}=E;D(v,O,C,k,new Array(k.length).fill(null),R).then(V=>{V.some(W=>W[3]!=="cpu")?postMessage({type:b,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:b,out:V},gi([...C,...V]))},V=>{postMessage({type:b,err:V})});break}case"end-profiling":mr(E),postMessage({type:b});break;default:}}catch(v){postMessage({type:b,err:v})}}),Ri=Ar?null:g=>new Worker(g??Qe,{type:"classic",name:zr})}),Mi,Bi,Qe,Or,sr,Di,Pi,Rr,Ui,Mr,Ni,Br,Li,Dr=T(()=>{Cr(),Mi=typeof location>"u"?void 0:location.origin,Bi=()=>{var c,g;return typeof document<"u"?(c=document.currentScript)==null?void 0:c.src:typeof self<"u"?(g=self.location)==null?void 0:g.href:void 0},Qe=Bi(),Or=()=>{if(Qe&&!Qe.startsWith("blob:"))return Qe.substring(0,Qe.lastIndexOf("/")+1)},sr=(c,g)=>{try{let b=g??Qe;return(b?new URL(c,b):new URL(c)).origin===Mi}catch{return!1}},Di=(c,g)=>{let b=g??Qe;try{return(b?new URL(c,b):new URL(c)).href}catch{return}},Pi=(c,g)=>`${g??"./"}${c}`,Rr=async c=>{let g=await(await fetch(c,{credentials:"same-origin"})).blob();return URL.createObjectURL(g)},Ui=async c=>(await import(c)).default,Mr=(rn(),de(Oi)).default,Ni=async()=>{if(!Qe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(sr(Qe))return[void 0,Mr()];let c=await Rr(Qe);return[c,Mr(c)]},Br=void 0,Li=async(c,g,b)=>{if(!c&&!g&&Br&&Qe&&sr(Qe))return[void 0,Br];{let E="ort-wasm-simd-threaded.mjs",v=c??Di(E,g),O=b&&v&&!sr(v,g),C=O?await Rr(v):v??Pi(E,g);return[O?C:void 0,await Ui(C)]}}}),Pr,or,Lt,Ur,qi,Vi,Fi,Nr,Te,Tt=T(()=>{Dr(),or=!1,Lt=!1,Ur=!1,qi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Vi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Fi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async c=>{if(or)return Promise.resolve();if(Lt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");Lt=!0;let g=c.initTimeout,b=c.numThreads;if(c.simd!==!1){if(c.simd==="relaxed"){if(!Fi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Vi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let E=qi();b>1&&!E&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+b+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),c.numThreads=b=1);let v=c.wasmPaths,O=typeof v=="string"?v:void 0,C=v==null?void 0:v.mjs,k=(C==null?void 0:C.href)??C,R=v==null?void 0:v.wasm,V=(R==null?void 0:R.href)??R,W=c.wasmBinary,[j,B]=await Li(k,O,b>1),ce=!1,A=[];if(g>0&&A.push(new Promise(X=>{setTimeout(()=>{ce=!0,X()},g)})),A.push(new Promise((X,Je)=>{let ze={numThreads:b};if(W)ze.wasmBinary=W;else if(V||O)ze.locateFile=Ce=>V??O+Ce;else if(k&&k.indexOf("blob:")!==0)ze.locateFile=Ce=>new URL(Ce,k).href;else if(j){let Ce=Or();Ce&&(ze.locateFile=Ze=>Ce+Ze)}B(ze).then(Ce=>{Lt=!1,or=!0,Pr=Ce,X(),j&&URL.revokeObjectURL(j)},Ce=>{Lt=!1,Ur=!0,Je(Ce)})})),await Promise.race(A),ce)throw new Error(`WebAssembly backend initializing failed due to timeout: ${g}ms`)},Te=()=>{if(or&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),tt,ur,ve,Lr=T(()=>{Tt(),tt=(c,g)=>{let b=Te(),E=b.lengthBytesUTF8(c)+1,v=b._malloc(E);return b.stringToUTF8(c,v,E),g.push(v),v},ur=(c,g,b,E)=>{if(typeof c=="object"&&c!==null){if(b.has(c))throw new Error("Circular reference in options");b.add(c)}Object.entries(c).forEach(([v,O])=>{let C=g?g+v:v;if(typeof O=="object")ur(O,C+".",b,E);else if(typeof O=="string"||typeof O=="number")E(C,O.toString());else if(typeof O=="boolean")E(C,O?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof O}`)})},ve=c=>{let g=Te(),b=g.stackSave();try{let E=g.PTR_SIZE,v=g.stackAlloc(2*E);g._OrtGetLastError(v,v+E);let O=Number(g.getValue(v,E===4?"i32":"i64")),C=g.getValue(v+E,"*"),k=C?g.UTF8ToString(C):"";throw new Error(`${c} ERROR_CODE: ${O}, ERROR_MESSAGE: ${k}`)}finally{g.stackRestore(b)}}}),Wi,an=T(()=>{Tt(),Lr(),Wi=c=>{let g=Te(),b=0,E=[],v=c||{};try{if((c==null?void 0:c.logSeverityLevel)===void 0)v.logSeverityLevel=2;else if(typeof c.logSeverityLevel!="number"||!Number.isInteger(c.logSeverityLevel)||c.logSeverityLevel<0||c.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${c.logSeverityLevel}`);if((c==null?void 0:c.logVerbosityLevel)===void 0)v.logVerbosityLevel=0;else if(typeof c.logVerbosityLevel!="number"||!Number.isInteger(c.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${c.logVerbosityLevel}`);(c==null?void 0:c.terminate)===void 0&&(v.terminate=!1);let O=0;return(c==null?void 0:c.tag)!==void 0&&(O=tt(c.tag,E)),b=g._OrtCreateRunOptions(v.logSeverityLevel,v.logVerbosityLevel,!!v.terminate,O),b===0&&ve("Can't create run options."),(c==null?void 0:c.extra)!==void 0&&ur(c.extra,"",new WeakSet,(C,k)=>{let R=tt(C,E),V=tt(k,E);g._OrtAddRunConfigEntry(b,R,V)!==0&&ve(`Can't set a run config entry: ${C} - ${k}.`)}),[b,E]}catch(O){throw b!==0&&g._OrtReleaseRunOptions(b),E.forEach(C=>g._free(C)),O}}}),Gi,ji,Hi,qt,Ki,Zi,nn=T(()=>{Tt(),Lr(),Gi=c=>{switch(c){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${c}`)}},ji=c=>{switch(c){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${c}`)}},Hi=c=>{c.extra||(c.extra={}),c.extra.session||(c.extra.session={});let g=c.extra.session;g.use_ort_model_bytes_directly||(g.use_ort_model_bytes_directly="1"),c.executionProviders&&c.executionProviders.some(b=>(typeof b=="string"?b:b.name)==="webgpu")&&(c.enableMemPattern=!1)},qt=(c,g,b,E)=>{let v=tt(g,E),O=tt(b,E);Te()._OrtAddSessionConfigEntry(c,v,O)!==0&&ve(`Can't set a session config entry: ${g} - ${b}.`)},Ki=async(c,g,b)=>{for(let E of g){let v=typeof E=="string"?E:E.name,O=[];switch(v){case"webnn":if(v="WEBNN",typeof E!="string"){let W=E==null?void 0:E.deviceType;W&&qt(c,"deviceType",W,b)}break;case"webgpu":if(v="JS",typeof E!="string"){let W=E;if(W!=null&&W.preferredLayout){if(W.preferredLayout!=="NCHW"&&W.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${W.preferredLayout}`);qt(c,"preferredLayout",W.preferredLayout,b)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${v}`)}let C=tt(v,b),k=O.length,R=0,V=0;if(k>0){R=Te()._malloc(k*Te().PTR_SIZE),b.push(R),V=Te()._malloc(k*Te().PTR_SIZE),b.push(V);for(let W=0;W<k;W++)Te().setValue(R+W*Te().PTR_SIZE,O[W][0],"*"),Te().setValue(V+W*Te().PTR_SIZE,O[W][1],"*")}await Te()._OrtAppendExecutionProvider(c,C,R,V,k)!==0&&ve(`Can't append execution provider: ${v}.`)}},Zi=async c=>{let g=Te(),b=0,E=[],v=c||{};Hi(v);try{let O=Gi(v.graphOptimizationLevel??"all"),C=ji(v.executionMode??"sequential"),k=typeof v.logId=="string"?tt(v.logId,E):0,R=v.logSeverityLevel??2;if(!Number.isInteger(R)||R<0||R>4)throw new Error(`log serverity level is not valid: ${R}`);let V=v.logVerbosityLevel??0;if(!Number.isInteger(V)||V<0||V>4)throw new Error(`log verbosity level is not valid: ${V}`);let W=typeof v.optimizedModelFilePath=="string"?tt(v.optimizedModelFilePath,E):0;if(b=g._OrtCreateSessionOptions(O,!!v.enableCpuMemArena,!!v.enableMemPattern,C,!!v.enableProfiling,0,k,R,V,W),b===0&&ve("Can't create session options."),v.executionProviders&&await Ki(b,v.executionProviders,E),v.enableGraphCapture!==void 0){if(typeof v.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${v.enableGraphCapture}`);qt(b,"enableGraphCapture",v.enableGraphCapture.toString(),E)}if(v.freeDimensionOverrides)for(let[j,B]of Object.entries(v.freeDimensionOverrides)){if(typeof j!="string")throw new Error(`free dimension override name must be a string: ${j}`);if(typeof B!="number"||!Number.isInteger(B)||B<0)throw new Error(`free dimension override value must be a non-negative integer: ${B}`);let ce=tt(j,E);g._OrtAddFreeDimensionOverride(b,ce,B)!==0&&ve(`Can't set a free dimension override: ${j} - ${B}.`)}return v.extra!==void 0&&ur(v.extra,"",new WeakSet,(j,B)=>{qt(b,j,B,E)}),[b,E]}catch(O){throw b!==0&&g._OrtReleaseSessionOptions(b)!==0&&ve("Can't release session options."),E.forEach(C=>g._free(C)),O}}}),Et,It,kt,qr,Vr,Fr,Wr,di,Se=T(()=>{Et=c=>{switch(c){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${c}`)}},It=c=>{switch(c){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${c}`)}},kt=(c,g)=>{let b=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][c],E=typeof g=="number"?g:g.reduce((v,O)=>v*O,1);return b>0?Math.ceil(E*b):void 0},qr=c=>{switch(c){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${c}`)}},Vr=c=>{switch(c){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${c}`)}},Fr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",Wr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint64"||c==="int8"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",di=c=>{switch(c){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${c}`)}}}),Gr,Qi=T(()=>{Cr(),Gr=async c=>{if(typeof c=="string"){let g=await fetch(c);if(!g.ok)throw new Error(`failed to load external data file: ${c}`);let b=g.headers.get("Content-Length"),E=b?parseInt(b,10):0;if(E<1073741824)return new Uint8Array(await g.arrayBuffer());{if(!g.body)throw new Error(`failed to load external data file: ${c}, no response body.`);let v=g.body.getReader(),O;try{O=new ArrayBuffer(E)}catch(k){if(k instanceof RangeError){let R=Math.ceil(E/65536);O=new WebAssembly.Memory({initial:R,maximum:R}).buffer}else throw k}let C=0;for(;;){let{done:k,value:R}=await v.read();if(k)break;let V=R.byteLength;new Uint8Array(O,C,V).set(R),C+=V}return new Uint8Array(O,0,E)}}else return c instanceof Blob?new Uint8Array(await c.arrayBuffer()):c instanceof Uint8Array?c:new Uint8Array(c)}}),Xi,pi,ci,Jt,fi,hi,De,Mt,mi,er,D,mr,gi,Yi=T(()=>{an(),nn(),Se(),Tt(),Lr(),Qi(),Xi=(c,g)=>{Te()._OrtInit(c,g)!==0&&ve("Can't initialize onnxruntime.")},pi=async c=>{Xi(c.wasm.numThreads,Vr(c.logLevel))},ci=async(c,g)=>{var b,E;(E=(b=Te()).asyncInit)==null||E.call(b)},Jt=new Map,fi=c=>{let g=Te(),b=g.stackSave();try{let E=g.PTR_SIZE,v=g.stackAlloc(2*E);g._OrtGetInputOutputCount(c,v,v+E)!==0&&ve("Can't get session input/output count.");let O=E===4?"i32":"i64";return[Number(g.getValue(v,O)),Number(g.getValue(v+E,O))]}finally{g.stackRestore(b)}},hi=(c,g)=>{let b=Te(),E=b.stackSave(),v=0;try{let O=b.PTR_SIZE,C=b.stackAlloc(2*O);b._OrtGetInputOutputMetadata(c,g,C,C+O)!==0&&ve("Can't get session input/output metadata.");let k=Number(b.getValue(C,"*"));v=Number(b.getValue(C+O,"*"));let R=b.HEAP32[v/4];if(R===0)return[k,0];let V=b.HEAPU32[v/4+1],W=[];for(let j=0;j<V;j++){let B=Number(b.getValue(v+8+j*O,"*"));W.push(B!==0?b.UTF8ToString(B):Number(b.getValue(v+8+(j+V)*O,"*")))}return[k,R,W]}finally{b.stackRestore(E),v!==0&&b._OrtFree(v)}},De=c=>{let g=Te(),b=g._malloc(c.byteLength);if(b===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${c.byteLength}.`);return g.HEAPU8.set(c,b),[b,c.byteLength]},Mt=async(c,g)=>{var W,j,B;let b,E,v=Te();Array.isArray(c)?[b,E]=c:c.buffer===v.HEAPU8.buffer?[b,E]=[c.byteOffset,c.byteLength]:[b,E]=De(c);let O=0,C=0,k=[],R=[],V=[];try{if([C,k]=await Zi(g),(g==null?void 0:g.externalData)&&v.mountExternalData){let Xe=[];for(let Ve of g.externalData){let ct=typeof Ve=="string"?Ve:Ve.path;Xe.push(Gr(typeof Ve=="string"?Ve:Ve.data).then(mt=>{v.mountExternalData(ct,mt)}))}await Promise.all(Xe)}for(let Xe of(g==null?void 0:g.executionProviders)??[])if((typeof Xe=="string"?Xe:Xe.name)==="webnn"){if(v.shouldTransferToMLTensor=!1,typeof Xe!="string"){let Ve=Xe,ct=Ve==null?void 0:Ve.context,mt=Ve==null?void 0:Ve.gpuDevice,xt=Ve==null?void 0:Ve.deviceType,Zr=Ve==null?void 0:Ve.powerPreference;ct?v.currentContext=ct:mt?v.currentContext=await v.webnnCreateMLContext(mt):v.currentContext=await v.webnnCreateMLContext({deviceType:xt,powerPreference:Zr})}else v.currentContext=await v.webnnCreateMLContext();break}O=await v._OrtCreateSession(b,E,C),(W=v.webgpuOnCreateSession)==null||W.call(v,O),O===0&&ve("Can't create a session."),(j=v.jsepOnCreateSession)==null||j.call(v),v.currentContext&&(v.webnnRegisterMLContext(O,v.currentContext),v.currentContext=void 0,v.shouldTransferToMLTensor=!0);let[ce,A]=fi(O),X=!!(g!=null&&g.enableGraphCapture),Je=[],ze=[],Ce=[],Ze=[],ge=[];for(let Xe=0;Xe<ce;Xe++){let[Ve,ct,mt]=hi(O,Xe);Ve===0&&ve("Can't get an input name."),R.push(Ve);let xt=v.UTF8ToString(Ve);Je.push(xt),Ce.push(ct===0?{name:xt,isTensor:!1}:{name:xt,isTensor:!0,type:It(ct),shape:mt})}for(let Xe=0;Xe<A;Xe++){let[Ve,ct,mt]=hi(O,Xe+ce);Ve===0&&ve("Can't get an output name."),V.push(Ve);let xt=v.UTF8ToString(Ve);ze.push(xt),Ze.push(ct===0?{name:xt,isTensor:!1}:{name:xt,isTensor:!0,type:It(ct),shape:mt})}return Jt.set(O,[O,R,V,null,X,!1]),[O,Je,ze,Ce,Ze]}catch(ce){throw R.forEach(A=>v._OrtFree(A)),V.forEach(A=>v._OrtFree(A)),O!==0&&v._OrtReleaseSession(O)!==0&&ve("Can't release session."),ce}finally{v._free(b),C!==0&&v._OrtReleaseSessionOptions(C)!==0&&ve("Can't release session options."),k.forEach(ce=>v._free(ce)),(B=v.unmountExternalData)==null||B.call(v)}},mi=c=>{var R,V,W;let g=Te(),b=Jt.get(c);if(!b)throw new Error(`cannot release session. invalid session id: ${c}`);let[E,v,O,C,k]=b;C&&(k&&g._OrtClearBoundOutputs(C.handle)!==0&&ve("Can't clear bound outputs."),g._OrtReleaseBinding(C.handle)!==0&&ve("Can't release IO binding.")),(R=g.jsepOnReleaseSession)==null||R.call(g,c),(V=g.webnnOnReleaseSession)==null||V.call(g,c),(W=g.webgpuOnReleaseSession)==null||W.call(g,c),v.forEach(j=>g._OrtFree(j)),O.forEach(j=>g._OrtFree(j)),g._OrtReleaseSession(E)!==0&&ve("Can't release session."),Jt.delete(c)},er=async(c,g,b,E,v,O,C=!1)=>{if(!c){g.push(0);return}let k=Te(),R=k.PTR_SIZE,V=c[0],W=c[1],j=c[3],B=j,ce,A;if(V==="string"&&(j==="gpu-buffer"||j==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(C&&j!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${O} when enableGraphCapture is true.`);if(j==="gpu-buffer"){let ze=c[2].gpuBuffer;A=kt(Et(V),W);{let Ce=k.jsepRegisterBuffer;if(!Ce)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');ce=Ce(E,O,ze,A)}}else if(j==="ml-tensor"){let ze=c[2].mlTensor;A=kt(Et(V),W);let Ce=k.webnnRegisterMLTensor;if(!Ce)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');ce=Ce(E,ze,Et(V),W)}else{let ze=c[2];if(Array.isArray(ze)){A=R*ze.length,ce=k._malloc(A),b.push(ce);for(let Ce=0;Ce<ze.length;Ce++){if(typeof ze[Ce]!="string")throw new TypeError(`tensor data at index ${Ce} is not a string`);k.setValue(ce+Ce*R,tt(ze[Ce],b),"*")}}else{let Ce=k.webnnIsGraphInput,Ze=k.webnnIsGraphOutput;if(V!=="string"&&Ce&&Ze){let ge=k.UTF8ToString(v);if(Ce(E,ge)||Ze(E,ge)){let Xe=Et(V);A=kt(Xe,W),B="ml-tensor";let Ve=k.webnnCreateTemporaryTensor,ct=k.webnnUploadTensor;if(!Ve||!ct)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let mt=await Ve(E,Xe,W);ct(mt,new Uint8Array(ze.buffer,ze.byteOffset,ze.byteLength)),ce=mt}else A=ze.byteLength,ce=k._malloc(A),b.push(ce),k.HEAPU8.set(new Uint8Array(ze.buffer,ze.byteOffset,A),ce)}else A=ze.byteLength,ce=k._malloc(A),b.push(ce),k.HEAPU8.set(new Uint8Array(ze.buffer,ze.byteOffset,A),ce)}}let X=k.stackSave(),Je=k.stackAlloc(4*W.length);try{W.forEach((Ce,Ze)=>k.setValue(Je+Ze*R,Ce,R===4?"i32":"i64"));let ze=k._OrtCreateTensor(Et(V),ce,A,Je,W.length,di(B));ze===0&&ve(`Can't create tensor for input/output. session=${E}, index=${O}.`),g.push(ze)}finally{k.stackRestore(X)}},D=async(c,g,b,E,v,O)=>{var Zr,bt,sa;let C=Te(),k=C.PTR_SIZE,R=Jt.get(c);if(!R)throw new Error(`cannot run inference. invalid session id: ${c}`);let V=R[0],W=R[1],j=R[2],B=R[3],ce=R[4];R[5];let A=g.length,X=E.length,Je=0,ze=[],Ce=[],Ze=[],ge=[],Xe=C.stackSave(),Ve=C.stackAlloc(A*k),ct=C.stackAlloc(A*k),mt=C.stackAlloc(X*k),xt=C.stackAlloc(X*k);try{[Je,ze]=Wi(O);for(let Ne=0;Ne<A;Ne++)await er(b[Ne],Ce,ge,c,W[g[Ne]],g[Ne],ce);for(let Ne=0;Ne<X;Ne++)await er(v[Ne],Ze,ge,c,j[E[Ne]],A+E[Ne],ce);for(let Ne=0;Ne<A;Ne++)C.setValue(Ve+Ne*k,Ce[Ne],"*"),C.setValue(ct+Ne*k,W[g[Ne]],"*");for(let Ne=0;Ne<X;Ne++)C.setValue(mt+Ne*k,Ze[Ne],"*"),C.setValue(xt+Ne*k,j[E[Ne]],"*");(Zr=C.jsepOnRunStart)==null||Zr.call(C,V),(bt=C.webnnOnRunStart)==null||bt.call(C,V);let Bt;Bt=await C._OrtRun(V,ct,Ve,A,xt,X,mt,Je),Bt!==0&&ve("failed to call OrtRun().");let gt=[],oa=[];for(let Ne=0;Ne<X;Ne++){let Wt=Number(C.getValue(mt+Ne*k,"*"));if(Wt===Ze[Ne]){gt.push(v[Ne]);continue}let Aa=C.stackSave(),Gt=C.stackAlloc(4*k),Qr=!1,at,$t=0;try{C._OrtGetTensorData(Wt,Gt,Gt+k,Gt+2*k,Gt+3*k)!==0&&ve(`Can't access output tensor data on index ${Ne}.`);let Ei=k===4?"i32":"i64",Xr=Number(C.getValue(Gt,Ei));$t=C.getValue(Gt+k,"*");let Ct=C.getValue(Gt+k*2,"*"),Oa=Number(C.getValue(Gt+k*3,Ei)),jt=[];for(let nt=0;nt<Oa;nt++)jt.push(Number(C.getValue(Ct+nt*k,Ei)));C._OrtFree(Ct)!==0&&ve("Can't free memory for tensor dims.");let Ht=jt.reduce((nt,et)=>nt*et,1);at=It(Xr);let wr=B==null?void 0:B.outputPreferredLocations[E[Ne]];if(at==="string"){if(wr==="gpu-buffer"||wr==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let nt=[];for(let et=0;et<Ht;et++){let Pt=C.getValue($t+et*k,"*"),Ra=C.getValue($t+(et+1)*k,"*"),Ma=et===Ht-1?void 0:Ra-Pt;nt.push(C.UTF8ToString(Pt,Ma))}gt.push([at,jt,nt,"cpu"])}else if(wr==="gpu-buffer"&&Ht>0){let nt=C.jsepGetBuffer;if(!nt)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let et=nt($t),Pt=kt(Xr,Ht);if(Pt===void 0||!Fr(at))throw new Error(`Unsupported data type: ${at}`);Qr=!0,gt.push([at,jt,{gpuBuffer:et,download:C.jsepCreateDownloader(et,Pt,at),dispose:()=>{C._OrtReleaseTensor(Wt)!==0&&ve("Can't release tensor.")}},"gpu-buffer"])}else if(wr==="ml-tensor"&&Ht>0){let nt=C.webnnEnsureTensor,et=C.webnnIsGraphInputOutputTypeSupported;if(!nt||!et)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(kt(Xr,Ht)===void 0||!Wr(at))throw new Error(`Unsupported data type: ${at}`);if(!et(c,at,!1))throw new Error(`preferredLocation "ml-tensor" for ${at} output is not supported by current WebNN Context.`);let Pt=await nt(c,$t,Xr,jt,!1);Qr=!0,gt.push([at,jt,{mlTensor:Pt,download:C.webnnCreateMLTensorDownloader($t,at),dispose:()=>{C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Wt)}},"ml-tensor"])}else if(wr==="ml-tensor-cpu-output"&&Ht>0){let nt=C.webnnCreateMLTensorDownloader($t,at)(),et=gt.length;Qr=!0,oa.push((async()=>{let Pt=[et,await nt];return C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Wt),Pt})()),gt.push([at,jt,[],"cpu"])}else{let nt=qr(at),et=new nt(Ht);new Uint8Array(et.buffer,et.byteOffset,et.byteLength).set(C.HEAPU8.subarray($t,$t+et.byteLength)),gt.push([at,jt,et,"cpu"])}}finally{C.stackRestore(Aa),at==="string"&&$t&&C._free($t),Qr||C._OrtReleaseTensor(Wt)}}B&&!ce&&(C._OrtClearBoundOutputs(B.handle)!==0&&ve("Can't clear bound outputs."),Jt.set(c,[V,W,j,B,ce,!1]));for(let[Ne,Wt]of await Promise.all(oa))gt[Ne][2]=Wt;return gt}finally{(sa=C.webnnOnRunEnd)==null||sa.call(C,V),C.stackRestore(Xe),Ce.forEach(Bt=>C._OrtReleaseTensor(Bt)),Ze.forEach(Bt=>C._OrtReleaseTensor(Bt)),ge.forEach(Bt=>C._free(Bt)),Je!==0&&C._OrtReleaseRunOptions(Je),ze.forEach(Bt=>C._free(Bt))}},mr=c=>{let g=Te(),b=Jt.get(c);if(!b)throw new Error("invalid session id");let E=b[0],v=g._OrtEndProfiling(E);v===0&&ve("Can't get an profile file name."),g._OrtFree(v)},gi=c=>{let g=[];for(let b of c){let E=b[2];!Array.isArray(E)&&"buffer"in E&&g.push(E.buffer)}return g}}),Vt,_e,tr,gr,lr,yr,jr,Hr,Ft,rr,yi,_i,wi,Ji,ea,Ca,_r,ta,ra=T(()=>{ht(),Yi(),Tt(),Dr(),Vt=()=>!!K.wasm.proxy&&typeof document<"u",tr=!1,gr=!1,lr=!1,Hr=new Map,Ft=(c,g)=>{let b=Hr.get(c);b?b.push(g):Hr.set(c,[g])},rr=()=>{if(tr||!gr||lr||!_e)throw new Error("worker not ready")},yi=c=>{switch(c.data.type){case"init-wasm":tr=!1,c.data.err?(lr=!0,jr[1](c.data.err)):(gr=!0,jr[0]()),yr&&(URL.revokeObjectURL(yr),yr=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let g=Hr.get(c.data.type);c.data.err?g.shift()[1](c.data.err):g.shift()[0](c.data.out);break}}},_i=async()=>{if(!gr){if(tr)throw new Error("multiple calls to 'initWasm()' detected.");if(lr)throw new Error("previous call to 'initWasm()' failed.");if(tr=!0,Vt())return new Promise((c,g)=>{_e==null||_e.terminate(),Ni().then(([b,E])=>{try{_e=E,_e.onerror=O=>g(O),_e.onmessage=yi,jr=[c,g];let v={type:"init-wasm",in:K};if(!v.in.wasm.wasmPaths&&b){let O=Or();O&&(v.in.wasm.wasmPaths=O)}_e.postMessage(v),yr=b}catch(v){g(v)}},g)});try{await Nr(K.wasm),await pi(K),gr=!0}catch(c){throw lr=!0,c}finally{tr=!1}}},wi=async c=>{if(Vt())return rr(),new Promise((g,b)=>{Ft("init-ep",[g,b]);let E={type:"init-ep",in:{epName:c,env:K}};_e.postMessage(E)});await ci(K,c)},Ji=async c=>Vt()?(rr(),new Promise((g,b)=>{Ft("copy-from",[g,b]);let E={type:"copy-from",in:{buffer:c}};_e.postMessage(E,[c.buffer])})):De(c),ea=async(c,g)=>{if(Vt()){if(g!=null&&g.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return rr(),new Promise((b,E)=>{Ft("create",[b,E]);let v={type:"create",in:{model:c,options:{...g}}},O=[];c instanceof Uint8Array&&O.push(c.buffer),_e.postMessage(v,O)})}else return Mt(c,g)},Ca=async c=>{if(Vt())return rr(),new Promise((g,b)=>{Ft("release",[g,b]);let E={type:"release",in:c};_e.postMessage(E)});mi(c)},_r=async(c,g,b,E,v,O)=>{if(Vt()){if(b.some(C=>C[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(v.some(C=>C))throw new Error("pre-allocated output tensor is not supported for proxy.");return rr(),new Promise((C,k)=>{Ft("run",[C,k]);let R=b,V={type:"run",in:{sessionId:c,inputIndices:g,inputs:R,outputIndices:E,options:O}};_e.postMessage(V,gi(R))})}else return D(c,g,b,E,v,O)},ta=async c=>{if(Vt())return rr(),new Promise((g,b)=>{Ft("end-profiling",[g,b]);let E={type:"end-profiling",in:c};_e.postMessage(E)});mr(c)}}),ia,bi,$i,vi=T(()=>{ht(),ra(),Se(),Cr(),Qi(),ia=(c,g)=>{switch(c.location){case"cpu":return[c.type,c.dims,c.data,"cpu"];case"gpu-buffer":return[c.type,c.dims,{gpuBuffer:c.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[c.type,c.dims,{mlTensor:c.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${c.location} for ${g()}`)}},bi=c=>{switch(c[3]){case"cpu":return new qe(c[0],c[2],c[1]);case"gpu-buffer":{let g=c[0];if(!Fr(g))throw new Error(`not supported data type: ${g} for deserializing GPU tensor`);let{gpuBuffer:b,download:E,dispose:v}=c[2];return qe.fromGpuBuffer(b,{dataType:g,dims:c[1],download:E,dispose:v})}case"ml-tensor":{let g=c[0];if(!Wr(g))throw new Error(`not supported data type: ${g} for deserializing MLTensor tensor`);let{mlTensor:b,download:E,dispose:v}=c[2];return qe.fromMLTensor(b,{dataType:g,dims:c[1],download:E,dispose:v})}default:throw new Error(`invalid data location: ${c[3]}`)}},$i=class{async fetchModelAndCopyToWasmMemory(c){return Ji(await Gr(c))}async loadModel(c,g){pt();let b;typeof c=="string"?b=await this.fetchModelAndCopyToWasmMemory(c):b=c,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await ea(b,g),ut()}async dispose(){return Ca(this.sessionId)}async run(c,g,b){pt();let E=[],v=[];Object.entries(c).forEach(j=>{let B=j[0],ce=j[1],A=this.inputNames.indexOf(B);if(A===-1)throw new Error(`invalid input '${B}'`);E.push(ce),v.push(A)});let O=[],C=[];Object.entries(g).forEach(j=>{let B=j[0],ce=j[1],A=this.outputNames.indexOf(B);if(A===-1)throw new Error(`invalid output '${B}'`);O.push(ce),C.push(A)});let k=E.map((j,B)=>ia(j,()=>`input "${this.inputNames[v[B]]}"`)),R=O.map((j,B)=>j?ia(j,()=>`output "${this.outputNames[C[B]]}"`):null),V=await _r(this.sessionId,v,k,C,R,b),W={};for(let j=0;j<V.length;j++)W[this.outputNames[C[j]]]=O[j]??bi(V[j]);return ut(),W}startProfiling(){}endProfiling(){ta(this.sessionId)}}}),Kr={};ee(Kr,{OnnxruntimeWebAssemblyBackend:()=>Si,initializeFlags:()=>xi,wasmBackend:()=>Ti});var xi,Si,Ti,aa=T(()=>{ht(),ra(),vi(),xi=()=>{(typeof K.wasm.initTimeout!="number"||K.wasm.initTimeout<0)&&(K.wasm.initTimeout=0);let c=K.wasm.simd;if(typeof c!="boolean"&&c!==void 0&&c!=="fixed"&&c!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${c}". Reset it to \`false\` and ignore SIMD feature checking.`),K.wasm.simd=!1),typeof K.wasm.proxy!="boolean"&&(K.wasm.proxy=!1),typeof K.wasm.trace!="boolean"&&(K.wasm.trace=!1),typeof K.wasm.numThreads!="number"||!Number.isInteger(K.wasm.numThreads)||K.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)K.wasm.numThreads=1;else{let g=typeof navigator>"u"?Z("node:os").cpus().length:navigator.hardwareConcurrency;K.wasm.numThreads=Math.min(4,Math.ceil((g||1)/2))}},Si=class{async init(c){xi(),await _i(),await wi(c)}async createInferenceSessionHandler(c,g){let b=new $i;return await b.loadModel(c,g),b}},Ti=new Si}),na={};ee(na,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>qe,default:()=>sn,env:()=>K,registerBackend:()=>le}),ht(),ht(),ht();var za="1.22.0",sn=Ai;{let c=(aa(),de(Kr)).wasmBackend;le("cpu",c,10),le("wasm",c,10)}return Object.defineProperty(K.versions,"web",{value:za,enumerable:!0}),de(na)})();I.exports=Y})(ms)),ms.exports}var _c;function rh(){return _c||(_c=1,(function(I){var M=hr&&hr.__createBinding||(Object.create?(function(Q,fe,oe,N){N===void 0&&(N=oe);var se=Object.getOwnPropertyDescriptor(fe,oe);(!se||("get"in se?!fe.__esModule:se.writable||se.configurable))&&(se={enumerable:!0,get:function(){return fe[oe]}}),Object.defineProperty(Q,N,se)}):(function(Q,fe,oe,N){N===void 0&&(N=oe),Q[N]=fe[oe]})),Y=hr&&hr.__setModuleDefault||(Object.create?(function(Q,fe){Object.defineProperty(Q,"default",{enumerable:!0,value:fe})}):function(Q,fe){Q.default=fe}),te=hr&&hr.__importStar||function(Q){if(Q&&Q.__esModule)return Q;var fe={};if(Q!=null)for(var oe in Q)oe!=="default"&&Object.prototype.hasOwnProperty.call(Q,oe)&&M(fe,Q,oe);return Y(fe,Q),fe};Object.defineProperty(I,"__esModule",{value:!0}),I.MicVAD=I.getDefaultRealTimeVADOptions=I.ort=I.DEFAULT_MODEL=void 0;const L=te(th()),H=ws(),re=bs(),Z=ka(),T=Za(),ee=kc(),me=Cc();I.DEFAULT_MODEL="legacy",I.ort=L;const de="vad.worklet.bundle.min.js",ue="silero_vad_v5.onnx",pe="silero_vad_legacy.onnx",le=Q=>({...re.defaultFrameProcessorOptions,onFrameProcessed:()=>{},onVADMisfire:()=>{Z.log.debug("VAD misfire")},onSpeechStart:()=>{Z.log.debug("Detected speech start")},onSpeechEnd:()=>{Z.log.debug("Detected speech end")},onSpeechRealStart:()=>{Z.log.debug("Detected real speech start")},baseAssetPath:"./",onnxWASMBasePath:"./",model:Q,workletOptions:{},getStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),pauseStream:async fe=>{fe.getTracks().forEach(oe=>{oe.stop()})},resumeStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),ortConfig:fe=>{fe.env.logLevel="error"},startOnLoad:!0,processorType:"auto"});I.getDefaultRealTimeVADOptions=le;const ne=Q=>"audioWorklet"in Q&&typeof AudioWorkletNode=="function"?"AudioWorklet":"ScriptProcessor";async function ke(Q,fe,oe,N,se){await oe.audioWorklet.addModule(Q),fe.processorOptions={...fe.processorOptions??{},frameSamples:N};const K=new AudioWorkletNode(oe,"vad-helper-worklet",fe);return K.port.onmessage=async Ue=>{const Ae=Ue.data;if(!(typeof Ae=="object"&&Ae&&"message"in Ae)){console.error("Invalid message event",Ae);return}switch(Ae.message){case T.Message.AudioFrame:{if(!("data"in Ae&&Ae.data instanceof ArrayBuffer)){console.log("Audio frame message has no data");return}const Le=new Float32Array(Ae.data);await se(Le);break}}},K}async function Me(Q,fe,oe){const N=new me.Resampler({nativeSampleRate:Q.sampleRate,targetSampleRate:16e3,targetFrameSize:fe});Z.log.debug("using script processor");const K=Q.createScriptProcessor(4096,1,1);let Ue=!1;return K.onaudioprocess=async Ae=>{if(!Ue){Ue=!0;try{const Le=Ae.inputBuffer.getChannelData(0);Ae.outputBuffer.getChannelData(0).fill(0);const We=N.process(Le);for(const Ke of We)await oe(Ke)}catch(Le){console.error("Error processing audio:",Le)}finally{Ue=!1}}},K.connect(Q.destination),K}class Ie{constructor(fe,oe,N,se,K=!1,Ue=null,Ae=null,Le=null,ot=null,We=null,Ke=null,At="uninitialized",Ot=!1){this.options=fe,this.frameProcessor=oe,this.model=N,this.frameSamples=se,this.listening=K,this.errored=Ue,this._stream=Ae,this._audioContext=Le,this._vadNode=ot,this._mediaStreamAudioSourceNode=We,this._audioProcessorAdapterType=Ke,this.initializationState=At,this.ownsAudioContext=Ot,this.getAudioInstances=()=>{if(this._stream===null||this._audioContext===null||this._vadNode==null||this._mediaStreamAudioSourceNode==null)throw new Error("MicVAD has null stream, audio context, or processor adapter");return{stream:this._stream,audioContext:this._audioContext,vadNode:this._vadNode,mediaStreamAudioSourceNode:this._mediaStreamAudioSourceNode}},this.setErrored=je=>{this.initializationState="errored",this.errored=je},this.start=async()=>{switch(this.initializationState){case"uninitialized":{Z.log.debug("initializing micVAD"),this.initializationState="initializing",this.frameProcessor.resume();try{this._stream=await this.options.getStream()}catch(je){throw je instanceof Error?this.setErrored(je.message):this.setErrored(String(je)),je}if(this.options.audioContext?(console.log("using custom audio context"),this._audioContext=this.options.audioContext):(console.log("using default audio context"),this._audioContext=new AudioContext,this.ownsAudioContext=!0),!this._audioContext)throw this.setErrored("Audio context is null"),Error("Audio context is null");switch(this._audioProcessorAdapterType=this.options.processorType=="auto"?ne(this._audioContext):this.options.processorType,this._audioProcessorAdapterType){case"AudioWorklet":this._vadNode=await ke(this.options.baseAssetPath+de,this.options.workletOptions,this._audioContext,this.frameSamples,this.processFrame);break;case"ScriptProcessor":this._vadNode=await Me(this._audioContext,this.frameSamples,this.processFrame);break;default:throw new Error(`Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`)}this._mediaStreamAudioSourceNode=new MediaStreamAudioSourceNode(this._audioContext,{mediaStream:this._stream}),this._mediaStreamAudioSourceNode.connect(this._vadNode),Z.log.debug("started micVAD"),this.listening=!0,this.initializationState="initialized";break}case"initializing":{Z.log.warn("start called while initializing");break}case"initialized":{if(this.listening)return;this.listening=!0,this.frameProcessor.resume();const{stream:je,audioContext:ft,vadNode:nr}=this.getAudioInstances();this._stream=await this.options.resumeStream(je);const it=new MediaStreamAudioSourceNode(ft,{mediaStream:this._stream});this._mediaStreamAudioSourceNode=it,it.connect(nr);break}case"destroyed":{Z.log.warn("start called after destroyed");break}case"errored":{Z.log.error("start called after errored");break}default:{Z.log.warn("weird initialization state");break}}},this.pause=async()=>{if(!this.listening)return;this.listening=!1;const{stream:je,mediaStreamAudioSourceNode:ft}=this.getAudioInstances();await this.options.pauseStream(je),ft.disconnect(),this.frameProcessor.pause(this.handleFrameProcessorEvent)},this.destroy=async()=>{var ft;Z.log.debug("destroy called"),this.initializationState="destroyed";const{vadNode:je}=this.getAudioInstances();je instanceof AudioWorkletNode&&je.port.postMessage(T.Message.SpeechStop),this.listening&&await this.pause(),await this.model.release(),this.ownsAudioContext&&await((ft=this._audioContext)==null?void 0:ft.close())},this.setOptions=je=>{this.frameProcessor.setOptions(je)},this.processFrame=async je=>{await this.frameProcessor.process(je,this.handleFrameProcessorEvent)},this.handleFrameProcessorEvent=je=>{switch(je.msg){case T.Message.FrameProcessed:this.options.onFrameProcessed(je.probs,je.frame);break;case T.Message.SpeechStart:this.options.onSpeechStart();break;case T.Message.SpeechRealStart:this.options.onSpeechRealStart();break;case T.Message.VADMisfire:this.options.onVADMisfire();break;case T.Message.SpeechEnd:this.options.onSpeechEnd(je.audio);break}}}static async new(fe={}){const oe={...(0,I.getDefaultRealTimeVADOptions)(fe.model??I.DEFAULT_MODEL),...fe};(0,re.validateOptions)(oe),I.ort.env.wasm.wasmPaths=oe.onnxWASMBasePath,oe.ortConfig!==void 0&&oe.ortConfig(I.ort);const N=oe.model==="v5"?ue:pe,se=oe.baseAssetPath+N,K=oe.model==="v5"?ee.SileroV5.new:ee.SileroLegacy.new;let Ue;try{Ue=await K(I.ort,()=>(0,H.defaultModelFetcher)(se))}catch(Ke){throw console.error(`Encountered an error while loading model file ${se}`),Ke}const Ae=oe.model==="v5"?512:1536,Le=Ae/16,ot=new re.FrameProcessor(Ue.process,Ue.reset_state,{positiveSpeechThreshold:oe.positiveSpeechThreshold,negativeSpeechThreshold:oe.negativeSpeechThreshold,redemptionMs:oe.redemptionMs,preSpeechPadMs:oe.preSpeechPadMs,minSpeechMs:oe.minSpeechMs,submitUserSpeechOnPause:oe.submitUserSpeechOnPause},Le),We=new Ie(oe,ot,Ue,Ae);if(oe.startOnLoad)try{await We.start()}catch(Ke){throw console.error("Error starting micVad",Ke),Ke}return We}}I.MicVAD=Ie})(hr)),hr}var wc;function ih(){return wc||(wc=1,(function(I){Object.defineProperty(I,"__esModule",{value:!0}),I.getDefaultRealTimeVADOptions=I.MicVAD=I.DEFAULT_MODEL=I.utils=I.NonRealTimeVAD=I.Message=I.FrameProcessor=I.defaultModelFetcher=I.baseAssetPath=void 0;var M=Tc();Object.defineProperty(I,"baseAssetPath",{enumerable:!0,get:function(){return M.baseAssetPath}});var Y=ws();Object.defineProperty(I,"defaultModelFetcher",{enumerable:!0,get:function(){return Y.defaultModelFetcher}});var te=bs();Object.defineProperty(I,"FrameProcessor",{enumerable:!0,get:function(){return te.FrameProcessor}});var L=Za();Object.defineProperty(I,"Message",{enumerable:!0,get:function(){return L.Message}});var H=Jf();Object.defineProperty(I,"NonRealTimeVAD",{enumerable:!0,get:function(){return H.NonRealTimeVAD}});const re=eh();I.utils={audioFileToArray:re.audioFileToArray,minFramesForTargetMS:re.minFramesForTargetMS,arrayBufferToBase64:re.arrayBufferToBase64,encodeWAV:re.encodeWAV};var Z=rh();Object.defineProperty(I,"DEFAULT_MODEL",{enumerable:!0,get:function(){return Z.DEFAULT_MODEL}}),Object.defineProperty(I,"MicVAD",{enumerable:!0,get:function(){return Z.MicVAD}}),Object.defineProperty(I,"getDefaultRealTimeVADOptions",{enumerable:!0,get:function(){return Z.getDefaultRealTimeVADOptions}})})(cs)),cs}var ah=ih();function nh(I){if(!(I instanceof Float32Array))throw new TypeError("samples 必须为 Float32Array");const M=new ArrayBuffer(I.length*2),Y=new DataView(M);for(let te=0;te<I.length;te+=1){const L=Math.max(-1,Math.min(1,I[te])),H=L<0?Math.round(L*32768):Math.round(L*32767);Y.setInt16(te*2,H,!0)}return M}const Ac=16e3,Sr=Math.round(Ac*.12),bc=Ac*30,$c="ort-1.22.0-una-2",oi=()=>{};function sh(I){const M=String(I);return`${M.startsWith("/")?M:`/${M}`}${M.endsWith("/")?"":"/"}`}function oh(I={},M={}){const Y=I.onSpeechStart||oi,te=I.onPcm||oi,L=I.onSpeechEnd||oi,H=I.onMisfire||oi,re=I.onError||oi,Z=M.getUserMedia||(Pe=>navigator.mediaDevices.getUserMedia(Pe)),T=M.createAudioContext||(()=>new AudioContext),ee=M.createWorkletNode||(Pe=>new AudioWorkletNode(Pe,"pcm-capture",{numberOfInputs:1,numberOfOutputs:0,channelCount:1})),me=M.createVad||(Pe=>ah.MicVAD.new(Pe)),de=sh(M.baseUrl||"./"),ue=`${de}vad/`,pe=`${de}voice/pcm-capture.worklet.js`,le=`${ue}ort-wasm-simd-threaded.mjs?v=${$c}`,ne=`${ue}ort-wasm-simd-threaded.wasm?v=${$c}`;let ke=null,Me=null,Ie=null,Q=null,fe=null,oe=!1,N=!1,se=!1,K=!1,Ue=0,Ae=null,Le=Promise.resolve();const ot=new Float32Array(Sr);let We=0,Ke=0;function At(Pe){for(const qe of Pe)ot[Ke]=qe,Ke=(Ke+1)%Sr,We=Math.min(Sr,We+1)}function Ot(){const Pe=new Float32Array(Sr),qe=Sr-We,Rt=(Ke-We+Sr)%Sr;for(let dt=0;dt<We;dt+=1)Pe[qe+dt]=ot[(Rt+dt)%Sr];return Pe}function je(Pe){Pe.length&&(te(nh(Pe)),Ue+=Pe.length)}function ft(){return K?(K=!1,L(),!0):!1}async function nr(){!fe||!N||se||(await fe.pause(),N&&!se&&await fe.start())}function it(Pe){try{if(!N||se)return;const qe=Pe==null?void 0:Pe.data,Rt=qe instanceof Float32Array?qe:qe instanceof ArrayBuffer?new Float32Array(qe):null;if(!Rt)throw new TypeError("Worklet 必须发送 Float32Array 或 ArrayBuffer");if(At(Rt),!K)return;const dt=bc-Ue;dt>0&&je(Rt.length<=dt?Rt:Rt.subarray(0,dt)),Ue>=bc&&(ft(),Ae||(Ae=nr().catch(re).finally(()=>{Ae=null})))}catch(qe){re(qe)}}function J(){!N||se||K||(K=!0,Ue=0,Y(),je(Ot()))}function Ye(){ft()}function vt(){K&&(K=!1,H())}async function Nt(){ke=await Z({audio:{channelCount:1,echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}}),Me=T(),await Me.audioWorklet.addModule(pe),Q=ee(Me),Q.port.onmessage=it,Ie=Me.createMediaStreamSource(ke),Ie.connect(Q),fe=await me({model:"v5",redemptionMs:400,minSpeechMs:250,preSpeechPadMs:120,baseAssetPath:ue,onnxWASMBasePath:ue,ortConfig:Pe=>{Pe.env.logLevel="error",Pe.env.wasm.numThreads=1,Pe.env.wasm.proxy=!1,Pe.env.wasm.wasmPaths={mjs:le,wasm:ne}},audioContext:Me,startOnLoad:!1,getStream:async()=>ke,pauseStream:async()=>{},resumeStream:async()=>ke,onSpeechStart:J,onSpeechEnd:Ye,onVADMisfire:vt}),oe=!0}async function Tr(){if(se)throw new Error("语音采集器已销毁");if(!N)try{oe||await Nt(),Me.state==="suspended"&&await Me.resume(),await fe.start(),N=!0}catch(Pe){throw re(Pe),await li().catch(re),Pe}}async function Er(){!oe||!N||(N=!1,ft(),await fe.pause(),Me.state!=="closed"&&await Me.suspend())}async function li(){se||(se=!0,N=!1,K=!1,Ae&&await Ae.catch(oi),fe&&(await fe.pause(),await fe.destroy()),Ie&&Ie.disconnect(),Q&&(Q.port.onmessage=null,Q.disconnect()),Me&&Me.state!=="closed"&&await Me.close(),ke&&ke.getTracks().forEach(Pe=>Pe.stop()))}function He(Pe){const qe=Le.then(Pe,Pe);return Le=qe.catch(oi),qe}return{start:()=>He(Tr),pause:()=>He(Er),destroy:()=>He(li)}}const uh=new Set(["vad_endpoint","first_audio","buffer_depth","starvation","barge_in_stop"]),lh=new Set(["started","completed","accepted","cancelled","stale","underflow","error"]),dh=["turn_id","sequence","byte_count"];function Ea(I,M){return Reflect.get(I,M)}function ph(I){if(!I||typeof I!="object")return null;try{const M=Ea(I,"stage");if(!uh.has(M))return null;const Y={stage:M},te=Ea(I,"session_id");typeof te=="string"&&te.length&&(Y.session_id=te.slice(0,8));const L=Ea(I,"status");lh.has(L)&&(Y.status=L);for(const re of dh){const Z=Ea(I,re);Number.isSafeInteger(Z)&&Z>=0&&(Y[re]=Z)}const H=Ea(I,"duration_ms");return typeof H=="number"&&Number.isFinite(H)&&H>=0&&(Y.duration_ms=Math.round(H*1e3)/1e3),Object.freeze(Y)}catch{return null}}function ch(I=M=>console.info("[VoiceCallMetric]",M)){return M=>{try{const Y=ph(M);Y&&I(Y)}catch{}}}function fh(I={}){const M=I.now||(()=>performance.now()),Y=ch(I.reportMetric),te=new Set;let L=Object.freeze({state:"ended",sessionId:null,activeTurnId:null,muted:!1,transcript:"",assistantText:"",error:null});const H=(J,Ye={})=>{J==="pcm_playback_underflow"&&Y({session_id:L==null?void 0:L.sessionId,turn_id:Ye.turn_id,sequence:Ye.sequence,stage:"starvation",status:"underflow",duration_ms:Ye.gap_ms})},re=I.player||(I.createPlayer||Wf)({...I.playerDependencies,reportMetric:H});let Z=0,T=0,ee=!1,me=!1,de=!1,ue=!1,pe=null,le=null,ne=null,ke=0,Me=null,Ie=null;function Q(J){L=Object.freeze({...L,...J});for(const Ye of te)Ye(L)}function fe(J){Q({state:"error",error:J instanceof Error?J.message:String(J)})}function oe(J){return Number.isSafeInteger(J.turn_id)&&J.turn_id===L.activeTurnId&&J.session_id===L.sessionId&&L.state!=="ended"}function N(){const J=L.activeTurnId;if(!J||!L.sessionId)return;const Ye=M(),vt=re.interrupt(J);Y({session_id:L.sessionId,turn_id:J,stage:"barge_in_stop",status:vt!=null&&vt.accepted?"completed":"stale",duration_ms:Math.max(0,M()-Ye)}),Ke.sendInterrupt(L.sessionId,J)}function se(){!L.sessionId||L.muted||de||L.state==="connecting"||L.state==="ended"||(L.activeTurnId!==null&&N(),Z+=1,T=0,ee=!0,ne=M(),ke=0,Me=null,Ie=null,Ke.sendSpeechStart(L.sessionId,Z),Q({state:"listening",activeTurnId:Z,transcript:"",assistantText:"",error:null}))}function K(J){if(!ee||L.muted||!L.sessionId||L.activeTurnId===null)return;Ke.sendAudio(L.sessionId,L.activeTurnId,T,J).accepted&&(T+=1,Number.isSafeInteger(J==null?void 0:J.byteLength)&&(ke+=J.byteLength))}function Ue(){if(!ee||!L.sessionId||L.activeTurnId===null)return;ee=!1,Ke.sendSpeechEnd(L.sessionId,L.activeTurnId);const J=M();Y({session_id:L.sessionId,turn_id:L.activeTurnId,stage:"vad_endpoint",status:"completed",duration_ms:ne===null?0:Math.max(0,J-ne),byte_count:ke}),Me=J,Q({state:"recognizing"})}function Ae(){ee&&(ee=!1,Y({session_id:L.sessionId,turn_id:L.activeTurnId,stage:"vad_endpoint",status:"cancelled",duration_ms:ne===null?0:Math.max(0,M()-ne),byte_count:ke}),N(),Q({state:"listening",activeTurnId:null}))}const Le=I.capture||(I.createCapture||oh)({onSpeechStart:se,onPcm:K,onSpeechEnd:Ue,onMisfire:Ae,onError:J=>{Ot(J)}},I.captureDependencies);async function ot(J){if(J.type==="call_ready"){if(L.state!=="connecting"||L.sessionId)return;Q({sessionId:J.session_id}),await Le.start(),Q({state:"listening"});return}if(J.type==="call_ended"){if(J.session_id!==L.sessionId)return;de=!0,ee=!1,detachVisibilityListener(),await At(),Ke.disconnect(),Q({state:"ended",activeTurnId:null,sessionId:null});return}oe(J)&&(J.type==="transcript_final"?Q({state:"thinking",transcript:J.text}):J.type==="assistant_text_delta"?Q({state:"thinking",assistantText:`${L.assistantText}${J.text}`}):J.type==="tts_start"?(re.start(J.turn_id,{sample_rate:J.sample_rate,channels:J.channels,sample_width:J.sample_width}),Q({state:"speaking"})):J.type==="tts_end"?(re.seal(J.turn_id),Q({state:"listening"})):J.type==="turn_ignored"?(re.interrupt(J.turn_id),Q({state:"listening",activeTurnId:null,error:J.message})):J.type==="turn_cancelled"?(re.interrupt(J.turn_id),Q({state:J.reason==="barge_in"?"listening":"interrupted",activeTurnId:null})):J.type==="call_error"&&(re.interrupt(J.turn_id),Q({state:"error",activeTurnId:null,error:J.message})))}function We(J,Ye){if(!oe(J))return;const vt=re.enqueue(J.turn_id,J.sequence,Ye);if(!(vt!=null&&vt.accepted))return;Ie!==J.turn_id&&(Ie=J.turn_id,Y({session_id:L.sessionId,turn_id:J.turn_id,sequence:J.sequence,stage:"first_audio",status:"accepted",duration_ms:Me===null?0:Math.max(0,M()-Me),byte_count:Ye==null?void 0:Ye.byteLength}));const Nt=typeof re.snapshot=="function"?re.snapshot():null;Number.isSafeInteger(Nt==null?void 0:Nt.bufferedMs)&&Nt.bufferedMs>=0&&Y({session_id:L.sessionId,turn_id:J.turn_id,sequence:J.sequence,stage:"buffer_depth",status:"accepted",duration_ms:Nt.bufferedMs,byte_count:Ye==null?void 0:Ye.byteLength})}const Ke=I.socket||(I.createSocket||Kf)({...I.socketDependencies,onControl:J=>ot(J).catch(Ot),onPcm:We,onError:fe,onClose:()=>{!de&&L.state!=="ended"&&Ot(new Error("语音连接已断开"))}});function At(){return le||(le=Promise.allSettled([Le.destroy(),re.destroy()])),le}function Ot(J){return fe(J),pe||(ue=!0,ee=!1,pe=At().finally(()=>Ke.disconnect())),pe}async function je(){if(de)throw new Error("通话已经结束");if(ue)throw new Error("语音模块初始化失败，请重新加载通话");if(me){L.state==="interrupted"&&!L.muted&&(await Le.start(),Q({state:"listening"}));return}me=!0,Q({state:"connecting",error:null});try{if(await Ke.connect(),!Ke.sendCallStart().accepted)throw new Error("无法开始语音通话")}catch(J){throw fe(J),J}}async function ft(){if(de||!me)return L.muted;const J=!L.muted;return Q({muted:J}),J?(ee=!1,N(),await Le.pause(),Q({state:"interrupted",activeTurnId:null})):(await Le.start(),Q({state:"listening"})),J}async function nr(){de||(de=!0,ee=!1,L.activeTurnId!==null&&re.interrupt(L.activeTurnId),L.sessionId&&Ke.sendCallEnd(L.sessionId),await At(),Ke.disconnect(),Q({state:"ended",activeTurnId:null,sessionId:null}))}function it(J){return te.add(J),J(L),()=>te.delete(J)}return{start:je,end:nr,toggleMute:ft,subscribe:it,snapshot:()=>L}}const hh=Object.freeze({state:"ended",transcript:"",assistantText:"",error:null,muted:!1});function mh(I){const M=ar.useRef(null),Y=ar.useRef(null),[te,L]=ar.useState(hh),H=ar.useCallback(()=>{if(!M.current){const de=fh();M.current=de,Y.current=de.subscribe(L)}return M.current},[]),re=ar.useCallback(async()=>{I&&await H().start()},[I,H]),Z=ar.useCallback(async()=>{var ue;const de=M.current;de&&(await de.end(),(ue=Y.current)==null||ue.call(Y),Y.current=null,M.current=null)},[]),T=ar.useCallback(async()=>{M.current&&await M.current.start()},[]),ee=ar.useCallback(async()=>{M.current&&await M.current.toggleMute()},[]),me=ar.useCallback(()=>{window.location.reload()},[]);return ar.useEffect(()=>()=>{var de,ue;(de=Y.current)==null||de.call(Y),(ue=M.current)==null||ue.end()},[]),{status:te.state,userTranscript:te.transcript,assistantText:te.assistantText,error:te.error||"",muted:te.muted,startCall:re,endCall:Z,continueCall:T,toggleMute:ee,reloadCall:me}}const gh={connecting:"正在连接 UNA",listening:"UNA 正在倾听",recognizing:"正在识别你的话",thinking:"UNA 正在思考",speaking:"UNA 正在说话",interrupted:"通话已暂停",error:"通话遇到问题",ended:"准备好后开始通话"};function wh({authenticated:I}){const M=mh(I),Y=!["ended","error"].includes(M.status);return lt.jsxs("main",{className:"voice-call-page",children:[lt.jsx("a",{className:"voice-call-back",href:"./",children:"返回 UNA"}),lt.jsxs("section",{className:"voice-call-card","aria-label":"UNA 实时语音通话",children:[lt.jsx("div",{className:`voice-call-orb voice-call-orb--${M.status}`,"aria-hidden":"true",children:"UNA"}),lt.jsx("p",{className:"voice-call-status","aria-live":"polite",children:gh[M.status]||"UNA 实时语音"}),M.error&&lt.jsx("p",{className:"voice-call-error",role:"alert",children:M.error}),lt.jsxs("div",{className:"voice-call-transcript","aria-live":"polite",children:[M.userTranscript&&lt.jsxs("p",{children:[lt.jsx("span",{children:"你"}),M.userTranscript]}),M.assistantText&&lt.jsxs("p",{children:[lt.jsx("span",{children:"UNA"}),M.assistantText]})]}),lt.jsxs("div",{className:"voice-call-actions",children:[M.status==="ended"&&lt.jsx("button",{className:"voice-call-primary",onClick:M.startCall,children:"开始通话"}),M.status==="interrupted"&&!M.muted&&lt.jsx("button",{className:"voice-call-primary",onClick:M.continueCall,children:"继续通话"}),M.status==="error"&&lt.jsx("button",{className:"voice-call-primary",onClick:M.reloadCall,children:"重新加载通话"}),Y&&lt.jsx("button",{className:"voice-call-round",onClick:M.toggleMute,"aria-label":M.muted?"取消静音":"静音麦克风",children:M.muted?lt.jsx(Mf,{}):lt.jsx(Rf,{})}),M.status!=="ended"&&lt.jsx("button",{className:"voice-call-round voice-call-round--danger",onClick:M.endCall,"aria-label":"结束通话",children:lt.jsx(Bf,{})})]})]})]})}export{wh as default};
