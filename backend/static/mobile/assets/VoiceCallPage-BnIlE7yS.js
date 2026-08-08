import{c as lc,b as Tf,g as Ef,r as ar,j as lt}from"./index-Bdaj6Ns7.js";import{M as If}from"./mic-BUPHVGzL.js";var vt=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kf=lc("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.330.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cf=lc("PhoneOff",[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91",key:"z86iuo"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22",key:"11kh81"}]]),zf=.12,Af=.03,Of=.01,Rf=.008,Mf=4095,ds=()=>{};function Bf(v){if(!Number.isSafeInteger(v)||v<=0)throw new TypeError("turnId 必须为正安全整数")}function Df(v){if(!v||typeof v!="object")throw new TypeError("PCM format 必须为对象");if(!Number.isSafeInteger(v.sample_rate)||v.sample_rate<8e3||v.sample_rate>48e3)throw new RangeError("sample_rate 必须在 8000..48000");if(v.channels!==1)throw new RangeError("channels 必须为 1");if(v.sample_width!==2)throw new RangeError("sample_width 必须为 2");return Object.freeze({sample_rate:v.sample_rate,channels:1,sample_width:2})}function Pf(v){let O;if(v instanceof ArrayBuffer)O=new Uint8Array(v);else if(ArrayBuffer.isView(v))O=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);else throw new TypeError("PCM 必须为 ArrayBuffer 或 TypedArray");if(!O.byteLength||O.byteLength%2)throw new RangeError("PCM16 必须为非空偶数字节");return O.slice().buffer}function Uf(v={}){const O=v.createAudioContext||(()=>new AudioContext),W=v.now||(()=>performance.now()),H=v.reportMetric||ds;let N=null,Z=null,ie=!1,ne=Promise.resolve();function E(){return N||(N=O()),N}function se(V){for(const re of V.sources)try{re.stop()}catch{}V.sources.clear()}function Me(V){Z&&(Z.active=!1,Z.status=V,Z.pending.clear(),se(Z))}function be(V,re,Q){const De=re.byteLength/2,Ie=N.createBuffer(1,De,V.format.sample_rate),Ne=Ie.getChannelData(0),ot=new DataView(re);for(let We=0;We<De;We+=1)Ne[We]=ot.getInt16(We*2,!0)/32768;return Ie.__voiceSequence=Q,Ie}function le(V){let re=V.expectedSequence,Q=0;for(;V.pending.has(re);)Q+=V.pending.get(re).byteLength/2,re+=1;return Q}function ve(V){if(!(!V.active||Z!==V)){if(!V.playbackBegun){const re=le(V),Q=Math.ceil(V.format.sample_rate*zf);if(!V.sealed&&re<Q||!re)return;V.playbackBegun=!0,V.nextStartAt=N.currentTime+Af}for(;V.active&&V.pending.has(V.expectedSequence);){const re=V.expectedSequence,Q=V.pending.get(re);V.pending.delete(re);const De=N.currentTime>V.nextStartAt;De&&H("pcm_playback_underflow",{turn_id:V.turnId,sequence:re,gap_ms:Math.round((N.currentTime-V.nextStartAt)*1e3),at_ms:W()});const Ie=be(V,Q,re),Ne=N.createBufferSource();Ne.buffer=Ie,Ne.__voiceSequence=re;const ot=Math.max(V.nextStartAt,N.currentTime+Of);if(De&&typeof N.createGain=="function"){const We=N.createGain();We.gain.setValueAtTime(0,ot),We.gain.linearRampToValueAtTime(1,ot+Rf),Ne.connect(We),We.connect(N.destination)}else Ne.connect(N.destination);Ne.onended=()=>{V.sources.delete(Ne),V.active&&V.sealed&&!V.pending.size&&!V.sources.size&&(V.status="completed")},V.sources.add(Ne),Ne.start(ot),V.nextStartAt=ot+Ie.duration,V.expectedSequence+=1,V.status=V.sealed?"sealed":"playing"}V.sealed&&!V.pending.size&&!V.sources.size&&(V.status="completed")}}function ye(V){return ne=ne.catch(ds).then(async()=>{!V.active||Z!==V||ie||(N.state==="suspended"&&await N.resume(),ve(V))}),ne}function Ae(V){ye(V).catch(re=>{H("pcm_playback_error",{turn_id:V.turnId,message:re instanceof Error?re.message:String(re),at_ms:W()})})}function Ue(V,re){if(ie)throw new Error("PCM 播放器已销毁");Bf(V);const Q=Df(re);return E(),Me("superseded"),Z={turnId:V,format:Q,active:!0,status:"buffering",sealed:!1,playbackBegun:!1,expectedSequence:0,seenSequences:new Set,pending:new Map,sources:new Set,nextStartAt:0},{accepted:!0}}function Fe(V,re,Q){if(!Z||!Z.active||Z.turnId!==V)return{accepted:!1,reason:"stale"};if(Z.sealed)return{accepted:!1,reason:"sealed"};if(!Number.isSafeInteger(re)||re<0||re>Mf)return{accepted:!1,reason:"invalid_sequence"};if(Z.seenSequences.has(re))return{accepted:!1,reason:"duplicate"};let De;try{De=Pf(Q)}catch(Ie){return{accepted:!1,reason:"invalid_pcm",error:Ie}}return Z.seenSequences.add(re),Z.pending.set(re,De),Z.status="buffering",Ae(Z),{accepted:!0}}function Ce(V){if(!Z||!Z.active||Z.turnId!==V)return{accepted:!1,reason:"stale"};Z.sealed=!0,Z.status="sealed";const Q=[...Z.pending.keys()].sort((Ie,Ne)=>Ie-Ne).at(-1);let De=null;if(Q!==void 0){for(let Ie=Z.expectedSequence;Ie<=Q;Ie+=1)if(!Z.seenSequences.has(Ie)){De=Ie;break}}return De!==null&&(Z.status="sequence_gap",H("pcm_sequence_gap",{turn_id:V,expected_sequence:De,at_ms:W()})),Ae(Z),De===null?{accepted:!0}:{accepted:!1,reason:"missing_sequence",expected_sequence:De}}function J(V){return!Z||Z.turnId!==V||!Z.active?{accepted:!1,reason:"stale"}:(Me("interrupted"),{accepted:!0})}async function ce(){ie||(ie=!0,Me("destroyed"),await ne.catch(ds),N&&N.state!=="closed"&&await N.close())}function ae(){if(!Z)return Object.freeze({status:ie?"destroyed":"idle"});const V=[...Z.pending.values()].reduce((re,Q)=>re+Q.byteLength/2,0);return Object.freeze({turnId:Z.turnId,status:Z.status,active:Z.active,sealed:Z.sealed,expectedSequence:Z.expectedSequence,pendingSequences:Object.freeze([...Z.pending.keys()].sort((re,Q)=>re-Q)),bufferedMs:Math.round(V/Z.format.sample_rate*1e3),nextStartAt:Z.nextStartAt})}return{start:Ue,enqueue:Fe,seal:Ce,interrupt:J,destroy:ce,snapshot:ae,whenScheduled:()=>ne}}const Xp=65536,dc=4095,Nf=9007199254740991,ja=8192,Yp=Object.freeze({call_start:[],user_speech_start:["session_id","turn_id"],input_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],user_speech_end:["session_id","turn_id"],interrupt:["session_id","turn_id"],call_end:["session_id"],pong:[]}),Jp=Object.freeze({call_ready:["session_id"],transcript_final:["session_id","turn_id","text"],assistant_text_delta:["session_id","turn_id","text"],assistant_text_end:["session_id","turn_id"],tts_start:["session_id","turn_id","sample_rate","channels","sample_width"],tts_end:["session_id","turn_id"],output_audio_chunk:["session_id","turn_id","direction","sequence","byte_length"],turn_ignored:["session_id","turn_id","reason","message"],turn_cancelled:["session_id","turn_id","reason"],call_error:["session_id","turn_id","code","message"],call_ended:["session_id"]});function rt(v){return new Error(v)}function cs(v){return v!==null&&typeof v=="object"&&!Array.isArray(v)}function ui(v,O){if(typeof v!="string"||!v.trim())throw rt(`${O} 不能为空`);return v}function fs(v,O){if(!Number.isSafeInteger(v)||v<=0||v>Nf)throw rt(`${O} 必须为正整数`);return v}function hs(v,O){const W=new Set(O),H=Object.keys(v);if(H.some(N=>!W.has(N)))throw rt("控制消息含未知字段");if(H.length!==W.size)throw rt("控制消息缺少字段")}function pc(v){if(!cs(v))throw rt("二进制帧头必须是对象");hs(v,["session_id","direction","turn_id","sequence","byte_length"]);const O=ui(v.session_id,"session_id");if(v.direction!=="input"&&v.direction!=="output")throw rt("direction 必须为 input 或 output");const W=fs(v.turn_id,"turn_id");if(!Number.isSafeInteger(v.sequence)||v.sequence<0||v.sequence>dc)throw rt("sequence 超出范围");if(!Number.isSafeInteger(v.byte_length)||v.byte_length<=0||v.byte_length>Xp)throw rt(`byte_length 必须在 1..${Xp}`);if(v.byte_length%2)throw rt("PCM16 必须为偶数字节");return Object.freeze({session_id:O,direction:v.direction,turn_id:W,sequence:v.sequence,byte_length:v.byte_length})}function Lf(v){if(!cs(v))throw rt("控制消息必须是对象");if(typeof v.type!="string"||!Object.hasOwn(Yp,v.type))throw rt("未知事件类型");const O=Yp[v.type];hs(v,["type",...O]);const W={type:v.type};if(O.includes("session_id")&&(W.session_id=ui(v.session_id,"session_id")),O.includes("turn_id")&&(W.turn_id=fs(v.turn_id,"turn_id")),O.includes("direction")){if(v.direction!=="input")throw rt("direction 必须为 input");W.direction="input"}if(O.includes("sequence")){if(!Number.isSafeInteger(v.sequence)||v.sequence<0||v.sequence>dc)throw rt("sequence 超出范围");W.sequence=v.sequence}return O.includes("byte_length")&&(W.byte_length=pc({session_id:W.session_id,direction:W.direction,turn_id:W.turn_id,sequence:W.sequence,byte_length:v.byte_length}).byte_length),W}function ec(v,O={}){const W=JSON.stringify(Lf({type:v,...O}));if(new TextEncoder().encode(W).byteLength>ja)throw rt(`控制消息不能超过 ${ja} 字节`);return W}function Vf(v){if(typeof v!="string")throw rt("控制消息必须是字符串");if(new TextEncoder().encode(v).byteLength>ja)throw rt(`控制消息不能超过 ${ja} 字节`);let O;try{O=JSON.parse(v)}catch{throw rt("控制消息不是合法 JSON")}if(!cs(O))throw rt("控制消息必须是对象");if(typeof O.type!="string"||!Object.hasOwn(Jp,O.type))throw rt("未知事件类型");const W=Jp[O.type];hs(O,["type",...W]);const H={type:O.type};if(W.includes("session_id")&&(H.session_id=ui(O.session_id,"session_id")),W.includes("turn_id")&&(H.turn_id=fs(O.turn_id,"turn_id")),W.includes("text")&&(H.text=ui(O.text,"text")),W.includes("reason")&&(H.reason=ui(O.reason,"reason")),W.includes("code")&&(H.code=ui(O.code,"code")),W.includes("message")&&(H.message=ui(O.message,"message")),O.type==="tts_start"){if(!Number.isSafeInteger(O.sample_rate)||O.sample_rate<8e3||O.sample_rate>48e3)throw rt("sample_rate 必须在 8000..48000");if(O.channels!==1)throw rt("channels 必须为 1");if(O.sample_width!==2)throw rt("sample_width 必须为 2");H.sample_rate=O.sample_rate,H.channels=O.channels,H.sample_width=O.sample_width}if(O.type==="output_audio_chunk"){const N=pc({session_id:O.session_id,turn_id:O.turn_id,direction:O.direction,sequence:O.sequence,byte_length:O.byte_length});if(N.direction!=="output")throw rt("direction 必须为 output");H.session_id=N.session_id,H.turn_id=N.turn_id,H.direction=N.direction,H.sequence=N.sequence,H.byte_length=N.byte_length}return H}function qf(v={}){const O=v.createTicket||(()=>Tf("语音通话")),W=v.WebSocketImpl||WebSocket,H=(v.websocketBase||Ef()).replace(/\/$/,""),N=v.onControl||(()=>{}),Z=v.onPcm||(()=>{}),ie=v.onClose||(()=>{}),ne=v.onError||(()=>{});let E=null,se=null,Me=null,be=!1;function le(Ce){const J=Ce instanceof Error?Ce:new Error(String(Ce));ne(J),Me=null,E&&E.readyState<2&&E.close(1003,"protocol error")}function ve(Ce){if(be)return;const J=Ce.data;if(typeof J=="string"){if(Me){le("音频元数据后必须紧跟 PCM 二进制数据");return}try{const V=Vf(J);V.type==="output_audio_chunk"?Me=V:N(V)}catch(V){le(V)}return}let ce;if(J instanceof ArrayBuffer)ce=J;else if(ArrayBuffer.isView(J))ce=J.buffer.slice(J.byteOffset,J.byteOffset+J.byteLength);else{le("语音二进制消息必须为 ArrayBuffer");return}if(!Me){le("PCM 二进制数据缺少元数据");return}const ae=Me;if(Me=null,ce.byteLength!==ae.byte_length){le("PCM 长度与元数据不一致");return}Z(ae,ce)}async function ye(){if(be)throw new Error("语音连接已关闭");return se||(se=(async()=>{const Ce=await O(),J=`${H}/ws/voice-call?ticket=${encodeURIComponent(Ce)}`;E=new W(J),E.binaryType="arraybuffer",await new Promise((ce,ae)=>{let V=!1;E.onopen=()=>{V=!0,ce()},E.onerror=()=>{const re=new Error("语音 WebSocket 连接失败");ne(re),V||(ae(re),E.readyState<2&&E.close(1011,"connect failed"))},E.onclose=re=>{Me=null;const Q=be;be=!0,ie(re),!V&&!Q&&ae(new Error("语音 WebSocket 在连接前关闭"))},E.onmessage=ve})})(),se)}function Ae(Ce,J={}){return!E||E.readyState!==1||be?{accepted:!1,reason:"closed"}:(E.send(ec(Ce,J)),{accepted:!0})}function Ue(Ce,J,ce,ae){if(!E||E.readyState!==1||be)return{accepted:!1,reason:"closed"};const V=ae instanceof ArrayBuffer?ae:ArrayBuffer.isView(ae)?ae.buffer.slice(ae.byteOffset,ae.byteOffset+ae.byteLength):null;if(!V||!V.byteLength)return{accepted:!1,reason:"invalid_pcm"};let re;try{re=ec("input_audio_chunk",{session_id:Ce,turn_id:J,direction:"input",sequence:ce,byte_length:V.byteLength})}catch(Q){return{accepted:!1,reason:"invalid_pcm",error:Q}}return E.send(re),E.send(V),{accepted:!0}}function Fe(Ce=1e3){be||(be=!0,Me=null,E&&E.readyState<2&&E.close(Ce))}return{connect:ye,sendCallStart:()=>Ae("call_start"),sendSpeechStart:(Ce,J)=>Ae("user_speech_start",{session_id:Ce,turn_id:J}),sendAudio:Ue,sendSpeechEnd:(Ce,J)=>Ae("user_speech_end",{session_id:Ce,turn_id:J}),sendInterrupt:(Ce,J)=>Ae("interrupt",{session_id:Ce,turn_id:J}),sendCallEnd:Ce=>Ae("call_end",{session_id:Ce}),disconnect:Fe,snapshot:()=>Object.freeze({connected:!!(E&&E.readyState===1&&!be),closed:be,awaitingPcm:!!Me})}}var cc={},Sa={};Object.defineProperty(Sa,"__esModule",{value:!0});Sa.baseAssetPath=void 0;const Ff=typeof window<"u"&&typeof window.document<"u",tc=Ff?window.document.currentScript:null;let fc="/";tc&&(fc=tc.src.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^/]+$/,"/"));Sa.baseAssetPath=fc;var zi={};Object.defineProperty(zi,"__esModule",{value:!0});zi.defaultModelFetcher=void 0;const Wf=v=>fetch(v).then(O=>O.arrayBuffer());zi.defaultModelFetcher=Wf;var sr={},Sr={};Object.defineProperty(Sr,"__esModule",{value:!0});Sr.log=void 0;const ps=v=>O=>{console.log(`VAD | ${v} >`,O)};Sr.log={error:ps("error"),debug:ps("debug"),warn:ps("warn")};var li={};Object.defineProperty(li,"__esModule",{value:!0});li.Message=void 0;var rc;(function(v){v.AudioFrame="AUDIO_FRAME",v.SpeechStart="SPEECH_START",v.VADMisfire="VAD_MISFIRE",v.SpeechEnd="SPEECH_END",v.SpeechStop="SPEECH_STOP",v.SpeechRealStart="SPEECH_REAL_START",v.FrameProcessed="FRAME_PROCESSED"})(rc||(li.Message=rc={}));Object.defineProperty(sr,"__esModule",{value:!0});sr.FrameProcessor=sr.validateOptions=sr.defaultFrameProcessorOptions=void 0;const $a=Sr,si=li;sr.defaultFrameProcessorOptions={positiveSpeechThreshold:.3,negativeSpeechThreshold:.25,preSpeechPadMs:800,redemptionMs:1400,minSpeechMs:400,submitUserSpeechOnPause:!1};function Gf(v){(v.positiveSpeechThreshold<0||v.positiveSpeechThreshold>1)&&$a.log.error("positiveSpeechThreshold should be a number between 0 and 1"),(v.negativeSpeechThreshold<0||v.negativeSpeechThreshold>v.positiveSpeechThreshold)&&$a.log.error("negativeSpeechThreshold should be between 0 and positiveSpeechThreshold"),v.preSpeechPadMs<0&&$a.log.error("preSpeechPadMs should be positive"),v.redemptionMs<0&&$a.log.error("redemptionMs should be positive"),v.minSpeechMs<0&&$a.log.error("minSpeechMs should be positive")}sr.validateOptions=Gf;const ic=v=>{const O=v.reduce((H,N)=>(H.push(H.at(-1)+N.length),H),[0]),W=new Float32Array(O.at(-1));return v.forEach((H,N)=>{const Z=O[N];W.set(H,Z)}),W};function ac(v,O){const W=Math.floor(v.redemptionMs/O),H=Math.floor(v.preSpeechPadMs/O),N=Math.floor(v.minSpeechMs/O);return{redemptionFrames:W,preSpeechPadFrames:H,minSpeechFrames:N}}class jf{constructor(O,W,H,N){this.modelProcessFunc=O,this.modelResetFunc=W,this.options=H,this.msPerFrame=N,this.speaking=!1,this.redemptionCounter=0,this.speechFrameCount=0,this.active=!1,this.speechRealStartFired=!1,this.setOptions=E=>{this.options={...this.options,...E};const{redemptionFrames:se,preSpeechPadFrames:Me,minSpeechFrames:be}=ac(this.options,this.msPerFrame);this.redemptionFrames=se,this.preSpeechPadFrames=Me,this.minSpeechFrames=be},this.reset=()=>{this.speaking=!1,this.speechRealStartFired=!1,this.audioBuffer=[],this.modelResetFunc(),this.redemptionCounter=0,this.speechFrameCount=0},this.pause=E=>{this.active=!1,this.options.submitUserSpeechOnPause?this.endSegment(E):this.reset()},this.resume=()=>{this.active=!0},this.endSegment=E=>{const se=this.audioBuffer;this.audioBuffer=[];const Me=this.speaking;if(this.reset(),Me)if(se.reduce((le,ve)=>ve.isSpeech?le+1:le,0)>=this.minSpeechFrames){const le=ic(se.map(ve=>ve.frame));E({msg:si.Message.SpeechEnd,audio:le})}else E({msg:si.Message.VADMisfire});return{}},this.process=async(E,se)=>{if(!this.active)return;const Me=await this.modelProcessFunc(E),be=Me.isSpeech>=this.options.positiveSpeechThreshold;if(se({probs:Me,msg:si.Message.FrameProcessed,frame:E}),this.audioBuffer.push({frame:E,isSpeech:be}),be&&(this.speechFrameCount++,this.redemptionCounter=0),be&&!this.speaking&&(this.speaking=!0,se({msg:si.Message.SpeechStart})),this.speaking&&this.speechFrameCount===this.minSpeechFrames&&!this.speechRealStartFired&&(this.speechRealStartFired=!0,se({msg:si.Message.SpeechRealStart})),Me.isSpeech<this.options.negativeSpeechThreshold&&this.speaking&&++this.redemptionCounter>=this.redemptionFrames){this.redemptionCounter=0,this.speechFrameCount=0,this.speaking=!1,this.speechRealStartFired=!1;const le=this.audioBuffer;if(this.audioBuffer=[],le.reduce((ye,Ae)=>Ae.isSpeech?ye+1:ye,0)>=this.minSpeechFrames){const ye=ic(le.map(Ae=>Ae.frame));se({msg:si.Message.SpeechEnd,audio:ye})}else se({msg:si.Message.VADMisfire})}if(!this.speaking){for(;this.audioBuffer.length>this.preSpeechPadFrames;)this.audioBuffer.shift();this.speechFrameCount=0}},this.audioBuffer=[];const{redemptionFrames:Z,preSpeechPadFrames:ie,minSpeechFrames:ne}=ac(this.options,this.msPerFrame);this.redemptionFrames=Z,this.preSpeechPadFrames=ie,this.minSpeechFrames=ne,this.reset()}}sr.FrameProcessor=jf;var hc={};function Nt(v){throw new Error('Could not dynamically require "'+v+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var mc={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */(function(v,O){var W=(()=>{var H=Object.defineProperty,N=Object.getOwnPropertyDescriptor,Z=Object.getOwnPropertyNames,ie=Object.prototype.hasOwnProperty,ne=(e=>typeof Nt<"u"?Nt:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof Nt<"u"?Nt:t)[r]}):e)(function(e){if(typeof Nt<"u")return Nt.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),E=(e,t)=>()=>(e&&(t=e(e=0)),t),se=(e,t)=>{for(var r in t)H(e,r,{get:t[r],enumerable:!0})},Me=(e,t,r,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of Z(t))!ie.call(e,a)&&a!==r&&H(e,a,{get:()=>t[a],enumerable:!(i=N(t,a))||i.enumerable});return e},be=e=>Me(H({},"__esModule",{value:!0}),e),le,ve,ye,Ae,Ue,Fe=E(()=>{le=new Map,ve=[],ye=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let i=le.get(e);if(i===void 0)le.set(e,{backend:t,priority:r});else{if(i.priority>r)return;if(i.priority===r&&i.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=ve.indexOf(e);a!==-1&&ve.splice(a,1);for(let n=0;n<ve.length;n++)if(le.get(ve[n]).priority<=r){ve.splice(n,0,e);return}ve.push(e)}return}throw new TypeError("not a valid backend")},Ae=async e=>{let t=le.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(i){return r||(t.error=`${i}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},Ue=async e=>{let t=e.executionProviders||[],r=t.map(u=>typeof u=="string"?u:u.name),i=r.length===0?ve:r,a,n=[],s=new Set;for(let u of i){let l=await Ae(u);typeof l=="string"?n.push({name:u,err:l}):(a||(a=l),a===l&&s.add(u))}if(!a)throw new Error(`no available backend found. ERR: ${n.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:l}of n)r.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${l}`);let o=t.filter(u=>s.has(typeof u=="string"?u:u.name));return[a,new Proxy(e,{get:(u,l)=>l==="executionProviders"?o:Reflect.get(u,l)})]}}),Ce=E(()=>{Fe()}),J,ce=E(()=>{J="1.22.0"}),ae,V,re=E(()=>{ce(),ae="warning",V={wasm:{},webgl:{},webgpu:{},versions:{common:J},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);ae=e}},get logLevel(){return ae}},Object.defineProperty(V,"logLevel",{enumerable:!0})}),Q,De=E(()=>{re(),Q=V}),Ie,Ne,ot=E(()=>{Ie=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let i=r.getContext("2d");if(i!=null){let a,n;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[3]):(a=e.dims[3],n=e.dims[2]);let s=(t==null?void 0:t.format)!==void 0?t.format:"RGB",o=t==null?void 0:t.norm,u,l;o===void 0||o.mean===void 0?u=[255,255,255,255]:typeof o.mean=="number"?u=[o.mean,o.mean,o.mean,o.mean]:(u=[o.mean[0],o.mean[1],o.mean[2],0],o.mean[3]!==void 0&&(u[3]=o.mean[3])),o===void 0||o.bias===void 0?l=[0,0,0,0]:typeof o.bias=="number"?l=[o.bias,o.bias,o.bias,o.bias]:(l=[o.bias[0],o.bias[1],o.bias[2],0],o.bias[3]!==void 0&&(l[3]=o.bias[3]));let d=n*a,p=0,f=d,h=d*2,m=-1;s==="RGBA"?(p=0,f=d,h=d*2,m=d*3):s==="RGB"?(p=0,f=d,h=d*2):s==="RBG"&&(p=0,h=d,f=d*2);for(let y=0;y<n;y++)for(let $=0;$<a;$++){let w=(e.data[p++]-l[0])*u[0],_=(e.data[f++]-l[1])*u[1],T=(e.data[h++]-l[2])*u[2],x=m===-1?255:(e.data[m++]-l[3])*u[3];i.fillStyle="rgba("+w+","+_+","+T+","+x+")",i.fillRect($,y,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Ne=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),i;if(r!=null){let a,n,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],n=e.dims[1],s=e.dims[3]):(a=e.dims[3],n=e.dims[2],s=e.dims[1]);let o=t!==void 0&&t.format!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,l,d;u===void 0||u.mean===void 0?l=[255,255,255,255]:typeof u.mean=="number"?l=[u.mean,u.mean,u.mean,u.mean]:(l=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(l[3]=u.mean[3])),u===void 0||u.bias===void 0?d=[0,0,0,0]:typeof u.bias=="number"?d=[u.bias,u.bias,u.bias,u.bias]:(d=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(d[3]=u.bias[3]));let p=n*a;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let f=4,h=0,m=1,y=2,$=3,w=0,_=p,T=p*2,x=-1;o==="RGBA"?(w=0,_=p,T=p*2,x=p*3):o==="RGB"?(w=0,_=p,T=p*2):o==="RBG"&&(w=0,T=p,_=p*2),i=r.createImageData(a,n);for(let z=0;z<n*a;h+=f,m+=f,y+=f,$+=f,z++)i.data[h]=(e.data[w++]-d[0])*l[0],i.data[m]=(e.data[_++]-d[1])*l[1],i.data[y]=(e.data[T++]-d[2])*l[2],i.data[$]=x===-1?255:(e.data[x++]-d[3])*l[3]}else throw new Error("Can not access image data");return i}}),We,Ke,Ot,Rt,je,ft,or=E(()=>{Be(),We=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:i}=t,a=t.norm??{mean:255,bias:0},n,s;typeof a.mean=="number"?n=[a.mean,a.mean,a.mean,a.mean]:n=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?s=[a.bias,a.bias,a.bias,a.bias]:s=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let o=t.format!==void 0?t.format:"RGBA",u=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*i,d=u==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),p=4,f=0,h=1,m=2,y=3,$=0,w=l,_=l*2,T=-1;o==="RGB"&&(p=3,f=0,h=1,m=2,y=-1),u==="RGBA"?T=l*3:u==="RBG"?($=0,_=l,w=l*2):u==="BGR"&&(_=0,w=l,$=l*2);for(let x=0;x<l;x++,f+=p,m+=p,h+=p,y+=p)d[$++]=(e[f]+s[0])/n[0],d[w++]=(e[h]+s[1])/n[1],d[_++]=(e[m]+s[2])/n[2],T!==-1&&y!==-1&&(d[T++]=(e[y]+s[3])/n[3]);return u==="RGBA"?new He("float32",d,[1,4,r,i]):new He("float32",d,[1,3,r,i])},Ke=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,i=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,n=typeof e=="string",s,o=t??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=d=>typeof HTMLCanvasElement<"u"&&d instanceof HTMLCanvasElement||d instanceof OffscreenCanvas?d.getContext("2d"):null;if(r){let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(f=t.resizedHeight,h=t.resizedWidth),t!==void 0){if(o=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");o.tensorFormat="RGBA",o.height=f,o.width=h}else o.tensorFormat="RGBA",o.height=f,o.width=h;p.drawImage(e,0,0),s=p.getImageData(0,0,h,f).data}else throw new Error("Can not access image data")}else if(i){let d,p;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(d=t.resizedHeight,p=t.resizedWidth):(d=e.height,p=e.width),t!==void 0&&(o=t),o.format="RGBA",o.height=d,o.width=p,t!==void 0){let f=u();f.width=p,f.height=d;let h=l(f);if(h!=null)h.putImageData(e,0,0),s=h.getImageData(0,0,p,d).data;else throw new Error("Can not access image data")}else s=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let f=e.height,h=e.width;return p.drawImage(e,0,0,h,f),s=p.getImageData(0,0,h,f).data,o.height=f,o.width=h,We(s,o)}else throw new Error("Can not access image data")}else{if(n)return new Promise((d,p)=>{let f=u(),h=l(f);if(!e||!h)return p();let m=new Image;m.crossOrigin="Anonymous",m.src=e,m.onload=()=>{f.width=m.width,f.height=m.height,h.drawImage(m,0,0,f.width,f.height);let y=h.getImageData(0,0,f.width,f.height);o.height=f.height,o.width=f.width,d(We(y.data,o))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return We(s,o);throw new Error("Input data provided is not supported - aborted tensor creation")},Ot=(e,t)=>{let{width:r,height:i,download:a,dispose:n}=t,s=[1,i,r,4];return new He({location:"texture",type:"float32",texture:e,dims:s,download:a,dispose:n})},Rt=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new He({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:i,download:a,dispose:n})},je=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:n}=t;return new He({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:i,download:a,dispose:n})},ft=(e,t,r)=>new He({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),it,Y,Ye,xt,Lt=E(()=>{it=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Y=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Ye=!1,xt=()=>{if(!Ye){Ye=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,i=typeof r<"u"&&r.from;e&&(it.set("int64",BigInt64Array),Y.set(BigInt64Array,"int64")),t&&(it.set("uint64",BigUint64Array),Y.set(BigUint64Array,"uint64")),i?(it.set("float16",r),Y.set(r,"float16")):it.set("float16",Uint16Array)}}}),Tr,Er,di=E(()=>{Be(),Tr=e=>{let t=1;for(let r=0;r<e.length;r++){let i=e[r];if(typeof i!="number"||!Number.isSafeInteger(i))throw new TypeError(`dims[${r}] must be an integer, got: ${i}`);if(i<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${i}`);t*=i}return t},Er=(e,t)=>{switch(e.location){case"cpu":return new He(e.type,e.data,t);case"cpu-pinned":return new He({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new He({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new He({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new He({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),He,Be=E(()=>{ot(),or(),Lt(),di(),He=class{constructor(e,t,r){xt();let i,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,i=e.type,a=e.dims,e.location){case"cpu-pinned":{let s=it.get(i);if(!s)throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);if(!(e.data instanceof s))throw new TypeError(`buffer should be of type ${s.name}`);this.cpuData=e.data;break}case"texture":{if(i!=="float32")throw new TypeError(`unsupported type "${i}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint64"&&i!=="int8"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let s,o;if(typeof e=="string")if(i=e,o=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");s=t}else{let u=it.get(e);if(u===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&u===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${u.name} as data.`);e==="uint64"||e==="int64"?s=u.from(t,BigInt):s=u.from(t)}else if(t instanceof u)s=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")s=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&u!==Uint16Array)s=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${i} tensor's data must be type of ${u}`)}else if(o=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let u=typeof e[0];if(u==="string")i="string",s=e;else if(u==="boolean")i="bool",s=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${u}.`)}else if(e instanceof Uint8ClampedArray)i="uint8",s=Uint8Array.from(e);else{let u=Y.get(e.constructor);if(u===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);i=u,s=e}if(o===void 0)o=[s.length];else if(!Array.isArray(o))throw new TypeError("A tensor's dims must be a number array");a=o,this.cpuData=s,this.dataLocation="cpu"}let n=Tr(a);if(this.cpuData&&n!==this.cpuData.length&&!((i==="uint4"||i==="int4")&&Math.ceil(n/2)===this.cpuData.length))throw new Error(`Tensor's size(${n}) does not match data length(${this.cpuData.length}).`);this.type=i,this.dims=a,this.size=n}static async fromImage(e,t){return Ke(e,t)}static fromTexture(e,t){return Ot(e,t)}static fromGpuBuffer(e,t){return Rt(e,t)}static fromMLTensor(e,t){return je(e,t)}static fromPinnedBuffer(e,t,r){return ft(e,t,r)}toDataURL(e){return Ie(this,e)}toImageData(e){return Ne(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Er(this,e)}}}),Le,Mt=E(()=>{Be(),Le=He}),dt,Ir,pt,ut,Ai=E(()=>{re(),dt=(e,t)=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||console.timeStamp(`${e}::ORT::${t}`)},Ir=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],i=!1;for(let n=0;n<r.length;n++){if(i&&!r[n].includes("TRACE_FUNC")){let s=`FUNC_${e}::${r[n].trim().split(" ")[1]}`;t&&(s+=`::${t}`),dt("CPU",s);return}r[n].includes("TRACE_FUNC")&&(i=!0)}},pt=e=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||Ir("BEGIN",e)},ut=e=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||Ir("END",e)}}),Oi,Za=E(()=>{Fe(),Mt(),Ai(),Oi=class gc{constructor(t){this.handler=t}async run(t,r,i){pt();let a={},n={};if(typeof t!="object"||t===null||t instanceof Le||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof Le)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,d=Object.getOwnPropertyNames(r);for(let p of this.outputNames)if(d.indexOf(p)!==-1){let f=r[p];(f===null||f instanceof Le)&&(l=!0,s=!1,a[p]=f)}if(l){if(typeof i=="object"&&i!==null)n=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else n=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(let l of this.outputNames)a[l]=null;let o=await this.handler.run(t,a,n),u={};for(let l in o)if(Object.hasOwnProperty.call(o,l)){let d=o[l];d instanceof Le?u[l]=d:u[l]=new Le(d.type,d.data,d.dims)}return ut(),u}async release(){return this.handler.dispose()}static async create(t,r,i,a){pt();let n,s={};if(typeof t=="string"){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(n=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let d=t,p=0,f=t.byteLength;if(typeof r=="object"&&r!==null)s=r;else if(typeof r=="number"){if(p=r,!Number.isSafeInteger(p))throw new RangeError("'byteOffset' must be an integer.");if(p<0||p>=d.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${d.byteLength}).`);if(f=t.byteLength-p,typeof i=="number"){if(f=i,!Number.isSafeInteger(f))throw new RangeError("'byteLength' must be an integer.");if(f<=0||p+f>d.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${d.byteLength-p}].`);if(typeof a=="object"&&a!==null)s=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof i<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");n=new Uint8Array(d,p,f)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[o,u]=await Ue(s),l=await o.createInferenceSessionHandler(n,u);return ut(),new gc(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Qa=E(()=>{Za(),kr=Oi}),Xa=E(()=>{}),Ya=E(()=>{}),Ja=E(()=>{}),en=E(()=>{}),Ri={};se(Ri,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>Le,env:()=>Q,registerBackend:()=>ye});var ht=E(()=>{Ce(),De(),Qa(),Mt(),Xa(),Ya(),Ai(),Ja(),en()}),Cr=E(()=>{}),Mi={};se(Mi,{default:()=>Bi});var zr,Ar,Bi,tn=E(()=>{var e;Bp(),Et(),Dr(),zr="ort-wasm-proxy-worker",Ar=((e=globalThis.self)==null?void 0:e.name)===zr,Ar&&(self.onmessage=t=>{let{type:r,in:i}=t.data;try{switch(r){case"init-wasm":Nr(i.wasm).then(()=>{Xn(i).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:n}=i;Yn(n,a).then(()=>{postMessage({type:r})},s=>{postMessage({type:r,err:s})});break}case"copy-from":{let{buffer:a}=i,n=Va(a);postMessage({type:r,out:n});break}case"create":{let{model:a,options:n}=i;es(a,n).then(s=>{postMessage({type:r,out:s})},s=>{postMessage({type:r,err:s})});break}case"release":ts(i),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:n,inputs:s,outputIndices:o,options:u}=i;is(a,n,s,o,new Array(o.length).fill(null),u).then(l=>{l.some(d=>d[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:l},ns([...s,...l]))},l=>{postMessage({type:r,err:l})});break}case"end-profiling":as(i),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),Bi=Ar?null:t=>new Worker(t??Qe,{type:"classic",name:zr})}),Di,Pi,Qe,Or,ur,Ui,Ni,Rr,Li,Mr,Vi,Br,qi,Dr=E(()=>{Cr(),Di=typeof location>"u"?void 0:location.origin,Pi=()=>{var e,t;return typeof document<"u"?(e=document.currentScript)==null?void 0:e.src:typeof self<"u"?(t=self.location)==null?void 0:t.href:void 0},Qe=Pi(),Or=()=>{if(Qe&&!Qe.startsWith("blob:"))return Qe.substring(0,Qe.lastIndexOf("/")+1)},ur=(e,t)=>{try{let r=t??Qe;return(r?new URL(e,r):new URL(e)).origin===Di}catch{return!1}},Ui=(e,t)=>{let r=t??Qe;try{return(r?new URL(e,r):new URL(e)).href}catch{return}},Ni=(e,t)=>`${t??"./"}${e}`,Rr=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Li=async e=>(await import(e)).default,Mr=(tn(),be(Mi)).default,Vi=async()=>{if(!Qe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(ur(Qe))return[void 0,Mr()];let e=await Rr(Qe);return[e,Mr(e)]},Br=void 0,qi=async(e,t,r)=>{if(!e&&!t&&Br&&Qe&&ur(Qe))return[void 0,Br];{let i="ort-wasm-simd-threaded.jsep.mjs",a=e??Ui(i,t),n=r&&a&&!ur(a,t),s=n?await Rr(a):a??Ni(i,t);return[n?s:void 0,await Li(s)]}}}),Pr,lr,Vt,Ur,Fi,Wi,Gi,Nr,xe,Et=E(()=>{Dr(),lr=!1,Vt=!1,Ur=!1,Fi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Wi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Gi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async e=>{if(lr)return Promise.resolve();if(Vt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");Vt=!0;let t=e.initTimeout,r=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Gi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Wi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let i=Fi();r>1&&!i&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,n=typeof a=="string"?a:void 0,s=a==null?void 0:a.mjs,o=(s==null?void 0:s.href)??s,u=a==null?void 0:a.wasm,l=(u==null?void 0:u.href)??u,d=e.wasmBinary,[p,f]=await qi(o,n,r>1),h=!1,m=[];if(t>0&&m.push(new Promise(y=>{setTimeout(()=>{h=!0,y()},t)})),m.push(new Promise((y,$)=>{let w={numThreads:r};if(d)w.wasmBinary=d;else if(l||n)w.locateFile=_=>l??n+_;else if(o&&o.indexOf("blob:")!==0)w.locateFile=_=>new URL(_,o).href;else if(p){let _=Or();_&&(w.locateFile=T=>_+T)}f(w).then(_=>{Vt=!1,lr=!0,Pr=_,y(),p&&URL.revokeObjectURL(p)},_=>{Vt=!1,Ur=!0,$(_)})})),await Promise.race(m),h)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},xe=()=>{if(lr&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),tt,dr,_e,Lr=E(()=>{Et(),tt=(e,t)=>{let r=xe(),i=r.lengthBytesUTF8(e)+1,a=r._malloc(i);return r.stringToUTF8(e,a,i),t.push(a),a},dr=(e,t,r,i)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,n])=>{let s=t?t+a:a;if(typeof n=="object")dr(n,s+".",r,i);else if(typeof n=="string"||typeof n=="number")i(s,n.toString());else if(typeof n=="boolean")i(s,n?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof n}`)})},_e=e=>{let t=xe(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetLastError(a,a+i);let n=Number(t.getValue(a,i===4?"i32":"i64")),s=t.getValue(a+i,"*"),o=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${n}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(r)}}}),ji,rn=E(()=>{Et(),Lr(),ji=e=>{let t=xe(),r=0,i=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let n=0;return(e==null?void 0:e.tag)!==void 0&&(n=tt(e.tag,i)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,n),r===0&&_e("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&dr(e.extra,"",new WeakSet,(s,o)=>{let u=tt(s,i),l=tt(o,i);t._OrtAddRunConfigEntry(r,u,l)!==0&&_e(`Can't set a run config entry: ${s} - ${o}.`)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseRunOptions(r),i.forEach(s=>t._free(s)),n}}}),Hi,Ki,Zi,qt,Qi,Xi,an=E(()=>{Et(),Lr(),Hi=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Ki=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Zi=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},qt=(e,t,r,i)=>{let a=tt(t,i),n=tt(r,i);xe()._OrtAddSessionConfigEntry(e,a,n)!==0&&_e(`Can't set a session config entry: ${t} - ${r}.`)},Qi=async(e,t,r)=>{for(let i of t){let a=typeof i=="string"?i:i.name,n=[];switch(a){case"webnn":if(a="WEBNN",typeof i!="string"){let d=i==null?void 0:i.deviceType;d&&qt(e,"deviceType",d,r)}break;case"webgpu":if(a="JS",typeof i!="string"){let d=i;if(d!=null&&d.preferredLayout){if(d.preferredLayout!=="NCHW"&&d.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${d.preferredLayout}`);qt(e,"preferredLayout",d.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${a}`)}let s=tt(a,r),o=n.length,u=0,l=0;if(o>0){u=xe()._malloc(o*xe().PTR_SIZE),r.push(u),l=xe()._malloc(o*xe().PTR_SIZE),r.push(l);for(let d=0;d<o;d++)xe().setValue(u+d*xe().PTR_SIZE,n[d][0],"*"),xe().setValue(l+d*xe().PTR_SIZE,n[d][1],"*")}await xe()._OrtAppendExecutionProvider(e,s,u,l,o)!==0&&_e(`Can't append execution provider: ${a}.`)}},Xi=async e=>{let t=xe(),r=0,i=[],a=e||{};Zi(a);try{let n=Hi(a.graphOptimizationLevel??"all"),s=Ki(a.executionMode??"sequential"),o=typeof a.logId=="string"?tt(a.logId,i):0,u=a.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log serverity level is not valid: ${u}`);let l=a.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let d=typeof a.optimizedModelFilePath=="string"?tt(a.optimizedModelFilePath,i):0;if(r=t._OrtCreateSessionOptions(n,!!a.enableCpuMemArena,!!a.enableMemPattern,s,!!a.enableProfiling,0,o,u,l,d),r===0&&_e("Can't create session options."),a.executionProviders&&await Qi(r,a.executionProviders,i),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);qt(r,"enableGraphCapture",a.enableGraphCapture.toString(),i)}if(a.freeDimensionOverrides)for(let[p,f]of Object.entries(a.freeDimensionOverrides)){if(typeof p!="string")throw new Error(`free dimension override name must be a string: ${p}`);if(typeof f!="number"||!Number.isInteger(f)||f<0)throw new Error(`free dimension override value must be a non-negative integer: ${f}`);let h=tt(p,i);t._OrtAddFreeDimensionOverride(r,h,f)!==0&&_e(`Can't set a free dimension override: ${p} - ${f}.`)}return a.extra!==void 0&&dr(a.extra,"",new WeakSet,(p,f)=>{qt(r,p,f,i)}),[r,i]}catch(n){throw r!==0&&t._OrtReleaseSessionOptions(r)!==0&&_e("Can't release session options."),i.forEach(s=>t._free(s)),n}}}),It,kt,Ct,Vr,qr,Fr,Wr,pi,$e=E(()=>{It=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},kt=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},Ct=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],i=typeof t=="number"?t:t.reduce((a,n)=>a*n,1);return r>0?Math.ceil(i*r):void 0},Vr=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},qr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Fr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Wr=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",pi=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Gr,Yi=E(()=>{Cr(),Gr=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),i=r?parseInt(r,10):0;if(i<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),n;try{n=new ArrayBuffer(i)}catch(o){if(o instanceof RangeError){let u=Math.ceil(i/65536);n=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw o}let s=0;for(;;){let{done:o,value:u}=await a.read();if(o)break;let l=u.byteLength;new Uint8Array(n,s,l).set(u),s+=l}return new Uint8Array(n,0,i)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Ji,ci,fi,Jt,hi,mi,Re,Bt=E(()=>{$e(),Ji=["V","I","W","E","F"],ci=(e,t)=>{console.log(`[${Ji[e]},${new Date().toISOString()}]${t}`)},hi=(e,t)=>{fi=e,Jt=t},mi=(e,t)=>{let r=qr(e),i=qr(fi);r>=i&&ci(r,typeof t=="function"?t():t)},Re=(...e)=>{Jt&&mi(...e)}}),gi,er,U,hr,yi,ea,Ft,fe=E(()=>{gi=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},er=class{static calcShape(e,t,r=!1){let i=e.length,a=t.length;if(i===0)return t;if(a===0)return e;let n=Math.max(e.length,t.length),s=new Array(n);if(r){if(i<2||a<2)return;let o=gi.calcMatMulShape([e[i-2],e[i-1]],[t[a-2],t[a-1]]);if(o===void 0)return;[s[n-2],s[n-1]]=o}for(let o=r?3:1;o<=n;o++){let u=i-o<0?1:e[i-o],l=a-o<0?1:t[a-o];if(u!==l&&u>1&&l>1)return;let d=Math.max(u,l);if(u&&l)s[n-o]=Math.max(u,l);else{if(d>1)return;s[n-o]=0}}return s}static isValidBroadcast(e,t){let r=e.length,i=t.length;if(r>i)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[i-a])return!1;return!0}},U=class Ga{static size(t){return Ga.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let i=t.length;if(i===0)return[];let a=new Array(i),n=i-1;for(;n>=0;){if(t[n]%r===0){a[n]=t[n]/r;break}if(r%t[n]!==0)throw new Error("cannot convert shape");a[n]=1,r/=t[n],n--}for(n--;n>=0;n--)a[n]=t[n];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Ga.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Ga.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,i){let a=1;for(let n=r;n<i;n++){if(t[n]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=Number(t[n])}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let i=new Array(r);i[r-1]=1,i[r-2]=t[r-1];for(let a=r-3;a>=0;--a)i[a]=i[a+1]*t[a+1];return i}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(i=>this.normalizeAxis(i,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(i=>t[i]):t.slice().reverse()}static padShape(t,r){let i=t.length;return t.map((a,n)=>a+r[n]+r[n+i])}static areEqual(t,r){return t.length!==r.length?!1:t.every((i,a)=>i===r[a])}},hr=class xa{static adjustPoolAttributes(t,r,i,a,n,s){if(!t&&i.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let o=0;o<r.length-2;o++)o>=i.length?i.push(r[o+2]):i[o]=r[o+2];for(let o=0;o<i.length;o++)if(o<a.length){if(a[o]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let o=0;o<i.length;o++)if(o<n.length){if(n[o]<0)throw new Error("dilations should be greater than or equal to 1")}else n.push(1);for(let o=0;o<i.length*2;o++)if(o<s.length){if(s[o]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let o=0;o<i.length;o++){if(i[o]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[o]>=i[o]||s[o+i.length]>=i[o])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,i,a,n,s,o){if(o){if(n.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<t.length-2;u++)xa.adjustPadAndReturnShape(t[u+(s?1:2)],r[u],i[u],a[u],n,u,u+t.length-2,o)}}static computePoolOutputShape(t,r,i,a,n,s,o){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let u=[r[0],r[1]];return xa.computeShapeHelper(t,r,u,i,a,n,s,o),u}static computeConvOutputShape(t,r,i,a,n,s,o){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[t[0],r[0]];return xa.computeShapeHelper(!1,t,u,i,a,n,s,o),u}static computeShapeHelper(t,r,i,a,n,s,o,u){if(t)for(let l=0;l<r.length-2;l++)i.push(1);else for(let l=0;l<r.length-2;l++)i.push(xa.adjustPadAndReturnShape(r[l+2],a[l],n[l],s[l],o,l,l+r.length-2,u))}static adjustPadAndReturnShape(t,r,i,a,n,s,o,u){let l=i*(a-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return n[s]=0,n[o]=0,Math.floor((t-l)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(i!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let d=((t+r-1)/r-1)*r+a-t;return n[s]=Math.floor(u==="SAME_LOWER"?(d+1)/2:d/2),n[o]=d-n[s],Math.floor((t+d-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+n[s]+n[o]-l)/r+1)}},yi=class{static getShapeOfGemmResult(e,t,r,i,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let n,s,o;t?(n=e[1],s=e[0]):(n=e[0],s=e[1]);let u=-1;if(i?(o=r[0],u=1):(o=r[1],u=0),r[u]!==s)throw new Error("dimension mismatch");if(n<=0||o<=0||s<=0)throw new Error("invalid shape specified");if(a&&!er.isValidBroadcast(a,[n,o]))throw new Error("gemm: invalid bias shape for broadcast");return[n,o,s]}},ea=-34028234663852886e22,Ft=34028234663852886e22}),tr,mr=E(()=>{$e(),tr=(e,t)=>new(Vr(t))(e)}),pr,gr,jr,Hr,Wt,rr,_i,wi,bi,ta,ra,Ea=E(()=>{$e(),Bt(),pr=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),gr=(e,t)=>{if(t==="int32")return e;let r=pr.get(t);if(!r)throw new Error(`WebNN backend does not support data type: ${t}`);let i=r/8;if(e.byteLength%i!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${i}.`);let a=e.byteLength/i,n=new(Vr(t))(e.buffer,e.byteOffset,a);switch(t){case"int64":case"uint64":{let s=new Int32Array(a);for(let o=0;o<a;o++){let u=n[o];if(u>2147483647n||u<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");s[o]=Number(u)}return new Uint8Array(s.buffer)}case"int8":case"uint8":case"uint32":{if(t==="uint32"&&n.some(o=>o>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let s=Int32Array.from(n,Number);return new Uint8Array(s.buffer)}default:throw new Error(`Unsupported data conversion from ${t} to 'int32'`)}},jr=(e,t)=>{if(t==="int32")return e;if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let r=e.byteLength/4,i=new Int32Array(e.buffer,e.byteOffset,r);switch(t){case"int64":{let a=BigInt64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"uint64":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let a=BigUint64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"int8":{if(i.some(n=>n<-128||n>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let a=Int8Array.from(i,Number);return new Uint8Array(a.buffer)}case"uint8":{if(i.some(a=>a<0||a>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(i,Number)}case"uint32":{if(i.some(n=>n<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let a=Uint32Array.from(i,Number);return new Uint8Array(a.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${t}`)}},Hr=1,Wt=()=>Hr++,rr=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),_i=(e,t)=>{let r=pr.get(e);if(!r)throw new Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((i,a)=>i*a)*r/8):0},wi=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:r,tensor:i,dataType:a,shape:n,fallbackDataType:s}=e;this.sessionId=t,this.mlContext=r,this.mlTensor=i,this.dataType=a,this.tensorShape=n,this.fallbackDataType=s}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return _i(this.dataType,this.tensorShape)}destroy(){Re("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),r=jr(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(r);return}else return r.buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,r){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===r.length&&this.tensorShape.every((i,a)=>i===r[a])}setIsDataConverted(e){this.isDataConverted=e}},bi=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,r,i){let a=this.tensorManager.getMLContext(e),n;if(!a.opSupportLimits().input.dataTypes.includes(t)){if(n=rr.get(t),!n||!a.opSupportLimits().input.dataTypes.includes(n))throw new Error(`WebNN backend does not support data type: ${t}`);Re("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${n}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(a,t,r))return this.wrapper.tensor;if(i){if(this.wrapper.byteLength!==_i(t,r))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let s=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,r,s,!0,!0,n),i&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")t=gr(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else Re("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,r;if(this.activeUpload){let i=(t=this.wrapper)!=null&&t.isDataConverted?jr(this.activeUpload,(r=this.wrapper)==null?void 0:r.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(i):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(i);return}else return i.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},ta=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=Wt();return this.tensorTrackersById.set(e,new bi(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,r,i,a){Re("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${r}, shape: ${i}, copyOld: ${a}}`);let n=this.tensorTrackersById.get(t);if(!n)throw new Error("Tensor not found.");return n.ensureTensor(e,r,i,a)}upload(e,t){let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");r.upload(t)}async download(e,t){Re("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");return r.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,r,i){let a=this.getMLContext(e),n=Wt(),s=new wi({sessionId:e,context:a,tensor:t,dataType:r,shape:i});return this.tensorTrackersById.set(n,new bi(this,s)),this.externalTensors.add(s),n}async getCachedTensor(e,t,r,i,a,n,s){let o=this.getMLContext(e);for(let[l,d]of this.freeTensors.entries())if(d.canReuseTensor(o,t,r)){Re("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}`);let p=this.freeTensors.splice(l,1)[0];return p.sessionId=e,p}Re("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${s?`fallbackDataType: ${s},`:""} shape: ${r}}`);let u=await o.createTensor({dataType:s??t,shape:r,dimensions:r,usage:i,writable:a,readable:n});return new wi({sessionId:e,context:o,tensor:u,dataType:t,shape:r,fallbackDataType:s})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},ra=(...e)=>new ta(...e)}),yr,ia,aa,na=E(()=>{$e(),Et(),mr(),Ea(),Bt(),yr=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),ia=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let r=Object.keys(e).sort(),i=Object.keys(t).sort();return r.length===i.length&&r.every((a,n)=>a===i[n]&&e[a]===t[a])},aa=class{constructor(e){this.tensorManager=ra(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,hi(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){Re("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){Re("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let r of t)Re("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${r}}`),this.tensorManager.releaseTensorId(r);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let r=this.mlContextCache.findIndex(i=>i.gpuDevice===e);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:i}),i}}else if(e===void 0){let r=this.mlContextCache.findIndex(i=>i.options===void 0&&i.gpuDevice===void 0);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:i}),i}}let t=this.mlContextCache.findIndex(r=>ia(r.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:r}),r}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);if(r.delete(e),r.size===0){this.sessionIdsByMLContext.delete(t);let i=this.mlContextCache.findIndex(a=>a.mlContext===t);i!==-1&&this.mlContextCache.splice(i,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){Re("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,i,a){let n=yr.get(r);if(!n)throw new Error(`Unsupported ONNX data type: ${r}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,n,i,a)}async createTemporaryTensor(e,t,r){Re("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${r}}`);let i=yr.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,a,i,r,!1);let n=this.temporarySessionTensorIds.get(e);return n?n.push(a):this.temporarySessionTensorIds.set(e,[a]),a}uploadTensor(e,t){if(!xe().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");Re("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return tr(r,t)}}registerMLTensor(e,t,r,i){let a=yr.get(r);if(!a)throw new Error(`Unsupported ONNX data type: ${r}`);let n=this.tensorManager.registerTensor(e,t,a,i);return Re("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${a}, dimensions: ${i}} -> {tensorId: ${n}}`),n}registerMLConstant(e,t,r,i,a,n,s=!1){if(!n)throw new Error("External mounted files are not available.");let o=e;e.startsWith("./")&&(o=e.substring(2));let u=n.get(o);if(!u)throw new Error(`File with name ${o} not found in preloaded files.`);if(t+r>u.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let l=u.slice(t,t+r).buffer,d;switch(a.dataType){case"float32":d=new Float32Array(l);break;case"float16":d=typeof Float16Array<"u"&&Float16Array.from?new Float16Array(l):new Uint16Array(l);break;case"int32":d=new Int32Array(l);break;case"uint32":d=new Uint32Array(l);break;case"int64":if(s){let p=gr(new Uint8Array(l),"int64");d=new Int32Array(p.buffer),a.dataType="int32"}else d=new BigInt64Array(l);break;case"uint64":d=new BigUint64Array(l);break;case"int8":d=new Int8Array(l);break;case"int4":case"uint4":case"uint8":d=new Uint8Array(l);break;default:throw new Error(`Unsupported data type: ${a.dataType} in creating WebNN Constant from external data.`)}return Re("verbose",()=>`[WebNN] registerMLConstant {dataType: ${a.dataType}, shape: ${a.shape}}} ${s?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),i.constant(a,d)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let r=this.sessionGraphInputs.get(e);return r?r.includes(t):!1}isGraphOutput(e,t){let r=this.sessionGraphOutputs.get(e);return r?r.includes(t):!1}isGraphInputOutputTypeSupported(e,t,r=!0){let i=this.mlContextBySessionId.get(e),a=yr.get(It(t));return typeof a>"u"?!1:r?!!(i!=null&&i.opSupportLimits().input.dataTypes.includes(a)):!!(i!=null&&i.opSupportLimits().output.dataTypes.includes(a))}flush(){}}}),$i=E(()=>{}),vi,xi,Kr,Si,Ti,Ei,sa,oa,Ia,nn=E(()=>{Bt(),$i(),vi=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),xi=[],Kr=e=>Math.ceil(Number(e)/16)*16,Si=e=>{for(let t=0;t<xi.length;t++){let r=xi[t];if(e<=r)return r}return Math.ceil(e/16)*16},Ti=1,Ei=()=>Ti++,sa=async(e,t,r,i)=>{let a=Kr(r),n=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,n,0,a),e.flush(),await n.mapAsync(GPUMapMode.READ);let o=n.getMappedRange();if(i){let u=i();return u.set(new Uint8Array(o,0,r)),u}else return new Uint8Array(o.slice(0,r))}finally{n.destroy()}},oa=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of vi)xi.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let r=t.buffer,i=t.byteOffset,a=t.byteLength,n=Kr(a),s=this.storageCache.get(e);if(!s)throw new Error("gpu data for uploading does not exist");if(Number(s.originalSize)!==a)throw new Error(`inconsistent data size. gpu data size=${s.originalSize}, data size=${a}`);let o=this.backend.device.createBuffer({mappedAtCreation:!0,size:n,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),u=o.getMappedRange();new Uint8Array(u).set(new Uint8Array(r,i,a)),o.unmap();let l=this.backend.device.createCommandEncoder();l.copyBufferToBuffer(o,0,s.gpuData.buffer,0,n),this.backend.device.queue.submit([l.finish()]),o.destroy(),Re("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let i=this.storageCache.get(t);if(!i)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==i.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=Kr(r.originalSize),n=this.backend.getCommandEncoder();this.backend.endComputePass(),n.copyBufferToBuffer(r.gpuData.buffer,0,i.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let i;if(r){if(i=r[0],e===r[1])return Re("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, buffer is the same, skip.`),i;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else i=Ei();return this.storageCache.set(i,{gpuData:{id:i,type:0,buffer:e},originalSize:t}),Re("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, registered.`),i}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),Re("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=Si(e),i,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,n=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||n){let o=(a?this.freeBuffers:this.freeUniformBuffers).get(r);o?o.length>0?i=o.pop():i=this.backend.device.createBuffer({size:r,usage:t}):i=this.backend.device.createBuffer({size:r,usage:t})}else i=this.backend.device.createBuffer({size:r,usage:t});let s={id:Ei(),type:0,buffer:i};return this.storageCache.set(s.id,{gpuData:s,originalSize:Number(e)}),Re("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${s.id}`),s}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,r=this.storageCache.get(t);if(!r){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return Re("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${r.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(r.gpuData.buffer),r.originalSize}async download(e,t){let r=this.storageCache.get(Number(e));if(!r)throw new Error("data does not exist");await sa(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=vi.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(Re("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(r=>{r.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Ia=(...e)=>new oa(...e)}),c,g,b=E(()=>{c=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},g=e=>new c(e)}),I,S,R,C,k,M,F,j,K,P,oe,A,X,Je,Ee,Te,Ze,de=E(()=>{$e(),fe(),I=64,S=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},R=(e,t=1)=>{let r=S(e,t);return typeof r=="string"?r:r[0]},C=(e,t=1)=>{let r=S(e,t);return typeof r=="string"?r:r[1]},k=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:U.computeStrides(r)})}),t},M=e=>e%4===0?4:e%2===0?2:1,F=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,j=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,K=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,P=(e,t,r,i)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?i==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:i==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,oe=(e,t,r,i,a)=>{let n=typeof r=="number",s=n?r:r.length,o=[...new Array(s).keys()],u=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,l=S(t,a),d=typeof l=="string"?l:l[1],p=typeof l=="string"?l:l[0],f={indices:u,value:d,storage:p,tensor:t},h=G=>typeof G=="string"?G:`${G}u`,m={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},y=n?"uniforms.":"",$=`${y}${e}_shape`,w=`${y}${e}_strides`,_="";for(let G=0;G<s-1;G++)_+=`
    let dim${G} = current / ${P(w,G,s)};
    let rest${G} = current % ${P(w,G,s)};
    indices[${G}] = dim${G};
    current = rest${G};
    `;_+=`indices[${s-1}] = current;`;let T=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${f.indices} {
    var indices: ${f.indices};
    var current = offset;
    ${_}
    return indices;
  }`,x=G=>(m.offsetToIndices=!0,s<2?G:`o2i_${e}(${G})`),z=[];if(s>=2)for(let G=s-1;G>=0;G--)z.push(`${P(w,G,s)} * (indices[${G}])`);let D=s<2?"":`
  fn i2o_${e}(indices: ${f.indices}) -> u32 {
    return ${z.join("+")};
  }`,B=G=>(m.indicesToOffset=!0,s<2?G:`i2o_${e}(${G})`),L=(...G)=>s===0?"0u":`${f.indices}(${G.map(h).join(",")})`,q=(G,te)=>s<2?`${G}`:`${P(G,te,s)}`,ee=(G,te,me)=>s<2?`${G}=${me};`:`${P(G,te,s)}=${me};`,we={},ue=(G,te)=>{m.broadcastedIndicesToOffset=!0;let me=`${te.name}broadcastedIndicesTo${e}Offset`;if(me in we)return`${me}(${G})`;let Oe=[];for(let Pt=s-1;Pt>=0;Pt--){let Ci=te.indicesGet("outputIndices",Pt+te.rank-s);Oe.push(`${q(w,Pt)} * (${Ci} % ${q($,Pt)})`)}return we[me]=`fn ${me}(outputIndices: ${te.type.indices}) -> u32 {
             return ${Oe.length>0?Oe.join("+"):"0u"};
           }`,`${me}(${G})`},ge=(G,te)=>(()=>{if(f.storage===f.value)return`${e}[${G}]=${te};`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`${e}[${G}]=vec2<u32>(u32(${te}), select(0u, 0xFFFFFFFFu, ${te} < 0));`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`${e}[${G}]=vec2<u32>(u32(${te}), 0u);`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`${e}[${G}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${te}));`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),qe=G=>(()=>{if(f.storage===f.value)return`${e}[${G}]`;if(f.storage==="vec2<u32>"&&f.value==="i32")return`i32(${e}[${G}].x)`;if(f.storage==="vec2<u32>"&&f.value==="u32")return`u32(${e}[${G}].x)`;if(f.storage==="u32"&&f.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${G}] & 0xFFu), bool(${e}[${G}] & 0xFF00u), bool(${e}[${G}] & 0xFF0000u), bool(${e}[${G}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${f.storage} and value type ${f.value} yet`)})(),ke=s<2?"":`
  fn get_${e}ByIndices(indices: ${f.indices}) -> ${d} {
    return ${qe(`i2o_${e}(indices)`)};
  }`,he=s<2?"":(()=>{let G=o.map(me=>`d${me}: u32`).join(", "),te=o.map(me=>`d${me}`).join(", ");return`
  fn get_${e}(${G}) -> ${d} {
    return get_${e}ByIndices(${L(te)});
  }`})(),ze=(...G)=>{if(G.length!==s)throw new Error(`indices length must be ${s}`);let te=G.map(h).join(",");return s===0?qe("0u"):s===1?qe(te[0]):(m.get=!0,m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}(${te})`)},pe=G=>s<2?qe(G):(m.getByIndices=!0,m.indicesToOffset=!0,`get_${e}ByIndices(${G})`),Se=s<2?"":`
  fn set_${e}ByIndices(indices: ${f.indices}, value: ${d}) {
    ${ge(`i2o_${e}(indices)`,"value")}
  }`,wt=s<2?"":(()=>{let G=o.map(me=>`d${me}: u32`).join(", "),te=o.map(me=>`d${me}`).join(", ");return`
  fn set_${e}(${G}, value: ${d}) {
    set_${e}ByIndices(${L(te)}, value);
  }`})();return{impl:()=>{let G=[],te=!1;return m.offsetToIndices&&(G.push(T),te=!0),m.indicesToOffset&&(G.push(D),te=!0),m.broadcastedIndicesToOffset&&(Object.values(we).forEach(me=>G.push(me)),te=!0),m.set&&(G.push(wt),te=!0),m.setByIndices&&(G.push(Se),te=!0),m.get&&(G.push(he),te=!0),m.getByIndices&&(G.push(ke),te=!0),!n&&te&&G.unshift(`const ${$} = ${f.indices}(${r.join(",")});`,`const ${w} = ${f.indices}(${U.computeStrides(r).join(",")});`),G.join(`
`)},type:f,offsetToIndices:x,indicesToOffset:B,broadcastedIndicesToOffset:ue,indices:L,indicesGet:q,indicesSet:ee,set:(...G)=>{if(G.length!==s+1)throw new Error(`indices length must be ${s}`);let te=G[s];if(typeof te!="string")throw new Error("value must be string");let me=G.slice(0,s).map(h).join(",");return s===0?ge("0u",te):s===1?ge(me[0],te):(m.set=!0,m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}(${me}, ${te})`)},setByOffset:ge,setByIndices:(G,te)=>s<2?ge(G,te):(m.setByIndices=!0,m.indicesToOffset=!0,`set_${e}ByIndices(${G}, ${te});`),get:ze,getByOffset:qe,getByIndices:pe,usage:i,name:e,strides:w,shape:$,rank:s}},A=(e,t,r,i=1)=>oe(e,t,r,"input",i),X=(e,t,r,i=1)=>oe(e,t,r,"output",i),Je=(e,t,r)=>oe(e,t,r,"atomicOutput",1),Ee=(e,t,r,i=1)=>oe(e,t,r,"internal",i),Te=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=I){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],i=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||i>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*i>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,n=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
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
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Ze=(e,t)=>new Te(e,t)}),Xe,Ve,ct,mt,St,Zr,bt,ua,Dt,gt=E(()=>{$e(),fe(),b(),de(),Xe=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Ve=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),ct=(e,t)=>U.sortBasedOnPerm(e,Ve(e.length,t)),mt=(e,t,r,i)=>{let a=`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let n=0;n<t;++n)a+=`a[${e[n]}]=i[${n}];`;return a+="return a;}"},St=(e,t)=>{let r=[],i=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&i.push(t[a]);return{newShape:r,newPerm:i}},Zr=(e,t)=>{let r=0;for(let i=0;i<e.length;++i)if(t[e[i]]!==1){if(e[i]<r)return!1;r=e[i]}return!0},bt=(e,t)=>{let r=e.dataType,i=e.dims.length,a=Ve(i,t),n=ct(e.dims,a),s=e.dims,o=n,u=i<2||Zr(a,e.dims),l;if(u)return l=m=>{let y=A("input",r,s,4),$=X("output",r,o,4);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}
  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let m=U.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64/4)},programUniforms:[{type:12,data:Math.ceil(m/4)}]}},getShaderSource:l};let{newShape:d,newPerm:p}=St(e.dims,a),f=U.areEqual(p,[2,3,1]),h=U.areEqual(p,[3,1,2]);if(d.length===2||f||h){s=f?[d[0],d[1]*d[2]]:h?[d[0]*d[1],d[2]]:d,o=[s[1],s[0]];let m=16;return l=y=>{let $=A("a",r,s.length),w=X("output",r,o.length);return`
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
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let y=U.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(o[1]/m),y:Math.ceil(o[0]/m)},programUniforms:[{type:12,data:y},...k(s,o)]}},getShaderSource:l}}return l=m=>{let y=A("a",r,s.length),$=X("output",r,o.length);return`
  ${m.registerUniform("output_size","u32").declareVariables(y,$)}

  ${mt(a,i,y,$)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${$.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${$.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let m=U.size(n);return{outputs:[{dims:n,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...k(s,o)]}},getShaderSource:l}},ua=(e,t)=>{Xe(e.inputs,t.perm),e.compute(bt(e.inputs[0],t.perm))},Dt=e=>g({perm:e.perm})}),la,Pe,Gt,ka,jt,Qr,at,$t,Ii,Xr,zt,Ca,Ht,Kt,_r,nt,et,Ut,za,Aa,_s,Ec=E(()=>{$e(),fe(),de(),on(),gt(),la={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},Pe={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},Gt={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},ka={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},jt=(e,t)=>{let r=[];for(let i=t-e;i<t;++i)r.push(i);return r},Qr=(e,t)=>{let r=[],i=e.length;for(let n=0;n<i;n++)t.indexOf(n)===-1&&r.push(e[n]);let a=t.map(n=>e[n]);return[r,a]},at=(e,t)=>{let r=e.length+t.length,i=[],a=0;for(let n=0;n<r;n++)t.indexOf(n)===-1?i.push(e[a++]):i.push(1);return i},$t=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},Ii=(e,t)=>{let r=[];if(!$t(e,t)){for(let i=0;i<t;++i)e.indexOf(i)===-1&&r.push(i);e.forEach(i=>r.push(i))}return r},Xr=(e,t,r,i,a,n,s)=>{let o=r[0].dims,u=U.size(n),l=U.size(s),d=A("_A",r[0].dataType,o),p=X("output",a,n),f=64;u===1&&(f=256);let h=`
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
            bestValue = ${Pe[i]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${p.setByOffset("outputIndex",`${i==="mean"?`${p.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${p.type.storage}(${ka[i]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${f}`,inputDependencies:["type"]},getShaderSource:m,getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:u},programUniforms:[{type:12,data:l}]})}},zt=(e,t,r,i)=>{let a=e.inputs.length===1?r:sn(e.inputs,r),n=a.axes;n.length===0&&!a.noopWithEmptyAxes&&(n=e.inputs[0].dims.map((h,m)=>m));let s=U.normalizeAxes(n,e.inputs[0].dims.length),o=s,u=e.inputs[0],l=Ii(o,e.inputs[0].dims.length);l.length>0&&(u=e.compute(bt(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],o=jt(o.length,u.dims.length));let[d,p]=Qr(u.dims,o),f=d;a.keepDims&&(f=at(d,s)),e.compute(Xr(t,a.cacheKey,[u],i,e.inputs[0].dataType,f,p),{inputs:[u]})},Ca=(e,t)=>{zt(e,"ReduceMeanShared",t,"mean")},Ht=(e,t)=>{zt(e,"ReduceL1Shared",t,"l1")},Kt=(e,t)=>{zt(e,"ReduceL2Shared",t,"l2")},_r=(e,t)=>{zt(e,"ReduceLogSumExpShared",t,"logSumExp")},nt=(e,t)=>{zt(e,"ReduceMaxShared",t,"max")},et=(e,t)=>{zt(e,"ReduceMinShared",t,"min")},Ut=(e,t)=>{zt(e,"ReduceProdShared",t,"prod")},za=(e,t)=>{zt(e,"ReduceSumShared",t,"sum")},Aa=(e,t)=>{zt(e,"ReduceSumSquareShared",t,"sumSquare")},_s=(e,t)=>{zt(e,"ReduceLogSumShared",t,"logSum")}}),Zt,ws,Oa,sn,Qt,bs,$s,vs,xs,Ss,Ts,Es,Is,ks,Cs,Xt,zs,As,Os,Rs,Ms,Bs,Ds,Ps,Us,Ns,on=E(()=>{$e(),fe(),b(),de(),Ec(),Zt=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},ws=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Oa=(e,t,r,i,a,n,s=!1,o=!1)=>{let u=[],l=r[0].dims,d=l.length,p=U.normalizeAxes(a,d),f=!o&&p.length===0;l.forEach((y,$)=>{f||p.indexOf($)>=0?s&&u.push(1):u.push(y)});let h=u.length,m=U.size(u);return{name:e,shaderCache:t,getShaderSource:y=>{let $=[],w=A("_A",r[0].dataType,d),_=X("output",n,h),T=i(w,_,p),x=T[2];for(let z=0,D=0;z<d;z++)f||p.indexOf(z)>=0?(s&&D++,x=`for(var j${z}: u32 = 0; j${z} < ${l[z]}; j${z}++) {
                  ${T[2].includes("last_index")?`let last_index = j${z};`:""}
                  ${w.indicesSet("input_indices",z,`j${z}`)}
                  ${x}
                }`):($.push(`${w.indicesSet("input_indices",z,_.indicesGet("output_indices",D))};`),D++);return`

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
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},Is=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceProd",t,(r,i)=>[`var value = ${i.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},ks=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Cs=(e,t)=>{Zt(e.inputs),Qt(e,"ReduceSumSquare",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Xt=(e,t,r)=>{if(t.length===0)return r;let i=1,a=1;for(let n=0;n<t.length;n++)t.indexOf(n)===-1?i*=e[n]:a*=e[n];return a<32&&i>1024},zs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ts(e,t):Ca(e,t)},As=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?$s(e,t):Ht(e,t)},Os=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vs(e,t):Kt(e,t)},Rs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xs(e,t):_r(e,t)},Ms=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ss(e,t):nt(e,t)},Bs=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Es(e,t):et(e,t)},Ds=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Is(e,t):Ut(e,t)},Ps=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ks(e,t):za(e,t)},Us=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Cs(e,t):Aa(e,t)},Ns=(e,t)=>{Xt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bs(e,t):_s(e,t)}}),un,Ls,Vs,ln,Ic=E(()=>{$e(),b(),on(),un=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},Ls=(e,t)=>{un(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Oa("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},Vs=(e,t)=>{un(e.inputs);let r=(i,a,n)=>{let s=[];for(let o=0;o<i.rank;o++)(n.indexOf(o)>=0||n.length===0)&&s.push(`input_indices[${o}] = 0;`);return[`${s.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Oa("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},ln=e=>g(e)}),qs,Ra,Fs,Ws,Gs,da,js,Hs,dn=E(()=>{$e(),fe(),$i(),de(),qs=(e,t)=>{let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4],o=e[5];if(s&&o)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=r.dims[0],l=r.dims[1],d=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(i.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(i.dims[0]!==d)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==i.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let p=a.dims[0]/3,f=p,h=f;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let T of t.qkvHiddenSizes)if(T%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");p=t.qkvHiddenSizes[0],f=t.qkvHiddenSizes[1],h=t.qkvHiddenSizes[2]}let m=l;if(p!==f)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==p+f+h)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let y=0;if(s){if(f!==h)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==f/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(y=s.dims[3])}let $=m+y,w=-1,_=0;if(n)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(o){if(o.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(o.dims[0]!==u||o.dims[1]!==t.numHeads||o.dims[2]!==l||o.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:l,pastSequenceLength:y,kvSequenceLength:m,totalSequenceLength:$,maxSequenceLength:w,inputHiddenSize:d,hiddenSize:p,vHiddenSize:h,headSize:Math.floor(p/t.numHeads),vHeadSize:Math.floor(h/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:_,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Ra=(e,t,r)=>t&&e?`
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
    `,Fs=(e,t,r,i,a,n,s,o)=>{let u=M(s?1:n),l=64,d=n/u;d<l&&(l=32);let p=Math.ceil(n/u/l),f=[{type:12,data:t},{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:d},{type:12,data:p}],h=R(e.dataType,u),m=C(1,u),y=["type"];s&&y.push("type"),o&&y.push("type");let $=w=>{let _=X("x",e.dataType,e.dims,u),T=[_],x=s?A("seq_lens",s.dataType,s.dims):void 0;x&&T.push(x);let z=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;z&&T.push(z);let D=C(e.dataType),B=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
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
        x[offset + i] = ${_.type.value}(${D}(1.0) / ${D}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${m}(x[offset + i]);
        x[offset + i] = ${_.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${s?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${_.type.value}(${D}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${h};${u}`,inputDependencies:y},getShaderSource:$,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:a,z:t*r},programUniforms:f})}},Ws=(e,t,r,i,a,n,s,o,u)=>{let l=s+n.kvSequenceLength,d=[n.batchSize,n.numHeads,n.sequenceLength,l],p=e>1&&i,f=n.kvNumHeads?n.kvNumHeads:n.numHeads,h=p?[n.batchSize,f,l,n.headSize]:void 0,m=n.nReps?n.nReps:1,y=n.scale===0?1/Math.sqrt(n.headSize):n.scale,$=M(n.headSize),w=n.headSize/$,_=12,T={x:Math.ceil(l/_),y:Math.ceil(n.sequenceLength/_),z:n.batchSize*n.numHeads},x=[{type:12,data:n.sequenceLength},{type:12,data:w},{type:12,data:l},{type:12,data:n.numHeads},{type:12,data:n.headSize},{type:1,data:y},{type:12,data:s},{type:12,data:n.kvSequenceLength},{type:12,data:m}],z=p&&i&&U.size(i.dims)>0,D=["type","type"];z&&D.push("type"),a&&D.push("type"),o&&D.push("type"),u&&D.push("type");let B=[{dims:d,dataType:t.dataType,gpuDataType:0}];p&&B.push({dims:h,dataType:t.dataType,gpuDataType:0});let L=q=>{let ee=A("q",t.dataType,t.dims,$),we=A("key",r.dataType,r.dims,$),ue=[ee,we];if(z){let Se=A("past_key",i.dataType,i.dims,$);ue.push(Se)}a&&ue.push(A("attention_bias",a.dataType,a.dims));let ge=o?A("seq_lens",o.dataType,o.dims):void 0;ge&&ue.push(ge);let qe=u?A("total_sequence_length_input",u.dataType,u.dims):void 0;qe&&ue.push(qe);let ke=X("output",t.dataType,d),he=[ke];p&&he.push(X("present_key",t.dataType,h,$));let ze=C(1,$),pe=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${_}u;

  var<workgroup> tileQ: array<${ee.type.storage}, ${_*_}>;
  var<workgroup> tileK: array<${ee.type.storage}, ${_*_}>;
  ${q.registerUniforms(pe).declareVariables(...ue,...he)}
  ${q.mainStart([_,_,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${m===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${m===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Ra(ge,qe,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${z&&p?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${p?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${ze}(0);
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
          value += ${ze}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch($){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${$}`)}})()};
        output[outputIdx] = ${ke.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${$};${a!==void 0};${i!==void 0};${e}`,inputDependencies:D},getRunData:()=>({outputs:B,dispatchGroup:T,programUniforms:x}),getShaderSource:L}},Gs=(e,t,r,i,a,n,s=void 0,o=void 0)=>{let u=n+a.kvSequenceLength,l=a.nReps?a.nReps:1,d=a.vHiddenSize*l,p=e>1&&i,f=a.kvNumHeads?a.kvNumHeads:a.numHeads,h=p?[a.batchSize,f,u,a.headSize]:void 0,m=[a.batchSize,a.sequenceLength,d],y=12,$={x:Math.ceil(a.vHeadSize/y),y:Math.ceil(a.sequenceLength/y),z:a.batchSize*a.numHeads},w=[{type:12,data:a.sequenceLength},{type:12,data:u},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:12,data:d},{type:12,data:n},{type:12,data:a.kvSequenceLength},{type:12,data:l}],_=p&&i&&U.size(i.dims)>0,T=["type","type"];_&&T.push("type"),s&&T.push("type"),o&&T.push("type");let x=[{dims:m,dataType:t.dataType,gpuDataType:0}];p&&x.push({dims:h,dataType:t.dataType,gpuDataType:0});let z=D=>{let B=A("probs",t.dataType,t.dims),L=A("v",r.dataType,r.dims),q=[B,L];_&&q.push(A("past_value",i.dataType,i.dims));let ee=s?A("seq_lens",s.dataType,s.dims):void 0;s&&q.push(ee);let we=o?A("total_sequence_length_input",o.dataType,o.dims):void 0;o&&q.push(we);let ue=[X("output",t.dataType,m)];p&&ue.push(X("present_value",t.dataType,h));let ge=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${y}u;
  var<workgroup> tileQ: array<${B.type.value}, ${y*y}>;
  var<workgroup> tileV: array<${B.type.value}, ${y*y}>;
  ${D.registerUniforms(ge).declareVariables(...q,...ue)}
  ${D.mainStart([y,y,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Ra(ee,we,!0)}
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
  }`};return{name:"AttentionScore",shaderCache:{hint:`${i!==void 0};${e}`,inputDependencies:T},getRunData:()=>({outputs:x,dispatchGroup:$,programUniforms:w}),getShaderSource:z}},da=(e,t,r,i,a,n,s,o,u,l,d=void 0,p=void 0)=>{let f=Math.min(e.outputCount,1+(s?1:0)+(o?1:0)),h=f>1?l.pastSequenceLength:0,m=h+l.kvSequenceLength,y=u&&U.size(u.dims)>0?u:void 0,$=[t,r];f>1&&s&&U.size(s.dims)>0&&$.push(s),y&&$.push(y),d&&$.push(d),p&&$.push(p);let w=e.compute(Ws(f,t,r,s,y,l,h,d,p),{inputs:$,outputs:f>1?[-1,1]:[-1]})[0];e.compute(Fs(w,l.batchSize,l.numHeads,h,l.sequenceLength,m,d,p),{inputs:d&&p?[w,d,p]:[w],outputs:[]});let _=[w,i];f>1&&o&&U.size(o.dims)>0&&_.push(o),d&&_.push(d),p&&_.push(p),e.compute(Gs(f,w,i,o,l,h,d,p),{inputs:_,outputs:f>1?[0,2]:[0]})},js=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],i=t.sequenceLength,a=t.inputHiddenSize,n=t.headSize,s=12,o={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},u=[e.inputs[0],e.inputs[1],e.inputs[2]],l=[{type:12,data:i},{type:12,data:a},{type:12,data:n},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],d=p=>{let f=X("output_q",u[0].dataType,r),h=X("output_k",u[0].dataType,r),m=X("output_v",u[0].dataType,r),y=A("input",u[0].dataType,u[0].dims),$=A("weight",u[1].dataType,u[1].dims),w=A("bias",u[2].dataType,u[2].dims),_=y.type.storage,T=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
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
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:l}),getShaderSource:d},{inputs:u,outputs:[-1,-1,-1]})},Hs=(e,t)=>{let r=qs(e.inputs,t),[i,a,n]=js(e,r);return da(e,i,a,n,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r)}}),Ks,Zs,Qs,Xs,kc=E(()=>{ht(),$e(),fe(),b(),de(),Ks=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(i,a,n)=>{let s=a.length;if(s!==i.length)throw new Error(`${n}: num dimensions != ${s}`);a.forEach((o,u)=>{if(o!==i[u])throw new Error(`${n}: dim[${u}] do not match`)})};if(e[0].dims.length>1){let i=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,i,"Invalid input scale"),r(e[2].dims,i,"Invalid input B"),r(e[3].dims,i,"Invalid input mean"),r(e[4].dims,i,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},Zs=(e,t)=>{let{epsilon:r,spatial:i,format:a}=t,n=e[0].dims,s=i?M(n[n.length-1]):1,o=a==="NHWC"&&n.length>1?s:1,u=U.size(n)/s,l=i,d=l?n.length:n,p=A("x",e[0].dataType,e[0].dims,s),f=A("scale",e[1].dataType,e[1].dims,o),h=A("bias",e[2].dataType,e[2].dims,o),m=A("inputMean",e[3].dataType,e[3].dims,o),y=A("inputVar",e[4].dataType,e[4].dims,o),$=X("y",e[0].dataType,d,s),w=()=>{let T="";if(i)T=`let cOffset = ${n.length===1?"0u":a==="NHWC"?`outputIndices[${n.length-1}] / ${s}`:"outputIndices[1]"};`;else if(a==="NCHW")T=`
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
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${i}_${s}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:_,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l?[{type:12,data:u},...k(n)]:[{type:12,data:u}]})}},Qs=e=>g(e),Xs=(e,t)=>{let{inputs:r,outputCount:i}=e,a=Qs({...t,outputCount:i});if(Q.webgpu.validateInputContent&&Ks(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(Zs(r,a))}}),Ys,Js,eo,Cc=E(()=>{fe(),de(),Ys=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Js=e=>{let t=e[0].dims,r=e[0].dims[2],i=U.size(t)/4,a=e[0].dataType,n=A("input",a,t,4),s=A("bias",a,[r],4),o=A("residual",a,t,4),u=X("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:l=>`
  const channels = ${r}u / 4;
  ${l.declareVariables(n,s,o,u)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let value = ${n.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${o.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},eo=e=>{Ys(e.inputs),e.compute(Js(e.inputs))}}),to,Ge,ro,io,ao,no,so,oo,uo,lo,po,co,fo,ho,mo,go,pa,yo,Ma,_o,wo,bo,$o,vo,xo,So,To,Eo,Io,ko,Co,zo,Ao,Oo,Ro,pn,Mo,cn,fn,Bo,Do,Po,Uo,No,Lo,hn=E(()=>{$e(),fe(),b(),de(),to=(e,t,r,i,a,n,s)=>{let o=Math.ceil(t/4),u="";typeof a=="string"?u=`${a}(a)`:u=a("a");let l=A("inputData",r,[o],4),d=X("outputData",i,[o],4),p=[{name:"vec_size",type:"u32"}];return s&&p.push(...s),`
      ${e.registerUniforms(p).declareVariables(l,d)}

  ${n??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${d.setByOffset("global_idx",u)}
  }`},Ge=(e,t,r,i,a,n=e.dataType,s,o)=>{let u=[{type:12,data:Math.ceil(U.size(e.dims)/4)}];return s&&u.push(...s),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:l=>to(l,U.size(e.dims),e.dataType,n,r,i,o),getRunData:l=>({outputs:[{dims:e.dims,dataType:n}],dispatchGroup:{x:Math.ceil(U.size(l[0].dims)/64/4)},programUniforms:u})}},ro=e=>{e.compute(Ge(e.inputs[0],"Abs","abs"))},io=e=>{e.compute(Ge(e.inputs[0],"Acos","acos"))},ao=e=>{e.compute(Ge(e.inputs[0],"Acosh","acosh"))},no=e=>{e.compute(Ge(e.inputs[0],"Asin","asin"))},so=e=>{e.compute(Ge(e.inputs[0],"Asinh","asinh"))},oo=e=>{e.compute(Ge(e.inputs[0],"Atan","atan"))},uo=e=>{e.compute(Ge(e.inputs[0],"Atanh","atanh"))},lo=e=>g(e),po=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(Ge(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},co=e=>{let t,r,i=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=i?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=i?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return g({min:t,max:r})},fo=(e,t)=>{let r=t||co(e.inputs),i=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${i}>(uniforms.min), vec4<${i}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:i},{name:"max",type:i}]),{inputs:[0]})},ho=e=>{e.compute(Ge(e.inputs[0],"Ceil","ceil"))},mo=e=>{e.compute(Ge(e.inputs[0],"Cos","cos"))},go=e=>{e.compute(Ge(e.inputs[0],"Cosh","cosh"))},pa=e=>g(e),yo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Elu",i=>`elu_vf32(${i})`,`
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
}`,_o=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Ma(t)))},wo=e=>{e.compute(Ge(e.inputs[0],"Exp","exp"))},bo=e=>{e.compute(Ge(e.inputs[0],"Floor","floor"))},$o=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Ma(t)))},vo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"LeakyRelu",i=>`select(leaky_relu_alpha_ * ${i}, ${i}, ${i} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},xo=e=>{e.compute(Ge(e.inputs[0],"Not",t=>`!${t}`))},So=e=>{e.compute(Ge(e.inputs[0],"Neg",t=>`-${t}`))},To=e=>{e.compute(Ge(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Eo=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},Io=e=>{e.compute(Ge(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},ko=e=>g(e),Co=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"HardSigmoid",i=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${i} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},zo=e=>{e.compute(Ge(e.inputs[0],"Sin","sin"))},Ao=e=>{e.compute(Ge(e.inputs[0],"Sinh","sinh"))},Oo=e=>{e.compute(Ge(e.inputs[0],"Sqrt","sqrt"))},Ro=e=>{e.compute(Ge(e.inputs[0],"Tan","tan"))},pn=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Mo=e=>{e.compute(Ge(e.inputs[0],"Tanh",pn))},cn=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${pn("v")};
}
`,fn=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Bo=e=>{let t=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"FastGelu",fn,cn(t),void 0,e.inputs[0].dataType))},Do=(e,t)=>{let r=C(e.inputs[0].dataType);return e.compute(Ge(e.inputs[0],"ThresholdedRelu",i=>`select(vec4<${r}>(0.0), ${i}, ${i} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},Po=e=>{e.compute(Ge(e.inputs[0],"Log","log"))},Uo=(e,t)=>`
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
`,No=e=>`quick_gelu_impl(${e})`,Lo=(e,t)=>{let r=C(e.inputs[0].dataType);e.compute(Ge(e.inputs[0],"QuickGelu",No,Uo(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Vo,qo,Fo,zc=E(()=>{fe(),de(),hn(),Vo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},qo=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=A("input",e[0].dataType,e[0].dims,4),i=A("bias",e[0].dataType,[e[0].dims[2]],4),a=X("output",e[0].dataType,t,4),n=U.size(t)/4,s=R(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)}}),getShaderSource:o=>`
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
  }`}},Fo=e=>{Vo(e.inputs),e.compute(qo(e.inputs))}}),Wo,Go,Yt,jo,Ho,Ko,Zo,Qo,Xo,Yo,Jo,eu,tu,Ac=E(()=>{$e(),fe(),de(),Wo=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f,h;typeof o=="string"?f=h=(_,T)=>`${o}((${_}),(${T}))`:typeof o=="function"?f=h=o:(f=o.scalar,h=o.vector);let m=X("outputData",d,i.length,4),y=A("aData",u,t.length,4),$=A("bData",l,r.length,4),w;if(a)if(n){let _=U.size(t)===1,T=U.size(r)===1,x=t.length>0&&t[t.length-1]%4===0,z=r.length>0&&r[r.length-1]%4===0;_||T?w=m.setByOffset("global_idx",h(_?`${y.type.value}(${y.getByOffset("0")}.x)`:y.getByOffset("global_idx"),T?`${$.type.value}(${$.getByOffset("0")}.x)`:$.getByOffset("global_idx"))):w=`
            let outputIndices = ${m.offsetToIndices("global_idx * 4u")};
            let offsetA = ${y.broadcastedIndicesToOffset("outputIndices",m)};
            let offsetB = ${$.broadcastedIndicesToOffset("outputIndices",m)};
            ${m.setByOffset("global_idx",h(s||x?y.getByOffset("offsetA / 4u"):`${y.type.value}(${y.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||z?$.getByOffset("offsetB / 4u"):`${$.type.value}(${$.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else w=m.setByOffset("global_idx",h(y.getByOffset("global_idx"),$.getByOffset("global_idx")));else{if(!n)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let _=(T,x,z="")=>{let D=`aData[indexA${x}][componentA${x}]`,B=`bData[indexB${x}][componentB${x}]`;return`
            let outputIndices${x} = ${m.offsetToIndices(`global_idx * 4u + ${x}u`)};
            let offsetA${x} = ${y.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let offsetB${x} = ${$.broadcastedIndicesToOffset(`outputIndices${x}`,m)};
            let indexA${x} = offsetA${x} / 4u;
            let indexB${x} = offsetB${x} / 4u;
            let componentA${x} = offsetA${x} % 4u;
            let componentB${x} = offsetB${x} % 4u;
            ${T}[${x}] = ${z}(${f(D,B)});
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
      }`},Go=(e,t,r,i,a,n,s=r.dataType)=>{let o=r.dims.map(y=>Number(y)??1),u=i.dims.map(y=>Number(y)??1),l=!U.areEqual(o,u),d=o,p=U.size(o),f=!1,h=!1,m=[l];if(l){let y=er.calcShape(o,u,!1);if(!y)throw new Error("Can't perform binary op on the given tensors");d=y.slice(),p=U.size(d);let $=U.size(o)===1,w=U.size(u)===1,_=o.length>0&&o[o.length-1]%4===0,T=u.length>0&&u[u.length-1]%4===0;m.push($),m.push(w),m.push(_),m.push(T);let x=1;for(let z=1;z<d.length;z++){let D=o[o.length-z],B=u[u.length-z];if(D===B)x*=D;else break}x%4===0?(h=!0,f=!0):($||w||_||T)&&(f=!0)}else f=!0;return m.push(f),{name:e,shaderCache:{hint:t+m.map(y=>y.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:y=>Wo(y,o,u,d,f,l,h,a,r.dataType,i.dataType,s,n),getRunData:()=>({outputs:[{dims:d,dataType:s}],dispatchGroup:{x:Math.ceil(p/64/4)},programUniforms:[{type:12,data:Math.ceil(U.size(d)/4)},...k(o,u,d)]})}},Yt=(e,t,r,i,a,n)=>{e.compute(Go(t,a??"",e.inputs[0],e.inputs[1],r,i,n))},jo=e=>{Yt(e,"Add",(t,r)=>`${t}+${r}`)},Ho=e=>{Yt(e,"Div",(t,r)=>`${t}/${r}`)},Ko=e=>{Yt(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},Zo=e=>{Yt(e,"Mul",(t,r)=>`${t}*${r}`)},Qo=e=>{let t=A("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Yt(e,"Pow",{scalar:(r,i)=>`pow_custom(${r},${i})`,vector:(r,i)=>`pow_vector_custom(${r},${i})`},`
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
      `)},Xo=e=>{Yt(e,"Sub",(t,r)=>`${t}-${r}`)},Yo=e=>{Yt(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},Jo=e=>{Yt(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},eu=e=>{Yt(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},tu=e=>{Yt(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),ru,iu,au,nu,su,ou,Oc=E(()=>{$e(),fe(),b(),de(),ru=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,i=e[r],a=i.dataType,n=i.dims.length;e.forEach((s,o)=>{if(o!==r){if(s.dataType!==a)throw new Error("input tensors should be one type");if(s.dims.length!==n)throw new Error("input tensors should have the same shape");s.dims.forEach((u,l)=>{if(l!==t&&u!==i.dims[l])throw new Error("non concat dimensions must match")})}})},iu=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,au=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;++a){let n=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?i.push(n):a===0?i.push(`if (inputIndex == ${a}u) { ${n} }`):a===r-1?i.push(`else { ${n} }`):i.push(`else if (inputIndex == ${a}) { ${n} }`)}return i.join(`
`)},nu=(e,t,r,i)=>{let a=U.size(r),n=new Array(e.length),s=new Array(e.length),o=0,u=[],l=[],d=[{type:12,data:a}];for(let y=0;y<e.length;++y)o+=e[y].dims[t],n[y]=o,l.push(e[y].dims.length),s[y]=A(`input${y}`,i,l[y]),u.push("rank"),d.push({type:12,data:n[y]});for(let y=0;y<e.length;++y)d.push(...k(e[y].dims));d.push(...k(r));let p=X("output",i,r.length),f=p.indicesGet("indices",t),h=Array.from(Array(n.length).keys()).map(y=>`uniforms.sizeInConcatAxis${y}`).join(","),m=y=>`

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
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:i}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:d}),getShaderSource:m}},su=(e,t)=>{let r=e.inputs,i=r[0].dims,a=U.normalizeAxis(t.axis,i.length);ru(r,a);let n=i.slice();n[a]=r.reduce((o,u)=>o+(u.dims.length>a?u.dims[a]:0),0);let s=r.filter(o=>U.size(o.dims)>0);e.compute(nu(s,a,n,r[0].dataType),{inputs:s})},ou=e=>g({axis:e.axis})}),Yr,Jr,ei,mn,ti=E(()=>{$e(),fe(),Yr=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},Jr=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},ei=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},mn=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,i]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:i}}else if(t==="Clip"){let[r,i]=(e==null?void 0:e.activation_params)||[ea,Ft];return{activation:t,clipMax:i,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),yt,uu,gn=E(()=>{yt=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},uu=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),lu,Rc=E(()=>{lu=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),ca,yn,_n=E(()=>{$e(),fe(),de(),ti(),ca=(e,t,r,i,a)=>{let n=i-r;return`
      ${Array.from({length:r}).map((s,o)=>`
      if (${P(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,P(a,o+n,i))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join("")}
`},yn=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s[s.length-2],l=o[o.length-1],d=s[s.length-1],p=M(l),f=M(d),h=M(u),m=U.size(r)/p/h,y=e.length>2,$=i?i.slice(0,-2):r.slice(0,-2),w=[U.size($),u,l],_=[{type:12,data:m},{type:12,data:u},{type:12,data:l},{type:12,data:d}];Jr(t,_),_.push(...k($,s,o)),y&&_.push(...k(e[2].dims)),_.push(...k(w));let T=x=>{let z=Ee("batch_dims",e[0].dataType,$.length),D=A("a",e[0].dataType,s.length,f),B=A("b",e[1].dataType,o.length,p),L=X("output",e[0].dataType,w.length,p),q=R(L.type.tensor),ee=Yr(t,L.type.value,q),we=[D,B],ue="";if(y){let ke=a?p:1;we.push(A("bias",e[2].dataType,e[2].dims.length,ke)),ue=`${a?`value += bias[col / ${ke}];`:`value += ${L.type.value}(bias[row + i]);`}`}let ge=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];ei(t,ge);let qe=()=>{let ke=`var a_data: ${D.type.value};`;for(let he=0;he<f;he++)ke+=`
              let b_data${he} = b[(b_offset + (k + ${he}) * uniforms.N + col) / ${p}];`;for(let he=0;he<h;he++){ke+=`a_data = a[(a_offset + (row + ${he}) * uniforms.K + k) / ${f}];`;for(let ze=0;ze<f;ze++)ke+=`
            values[${he}] = fma(${B.type.value}(a_data${f===1?"":`[${ze}]`}), b_data${ze}, values[${he}]);
`}return ke};return`
  ${x.registerUniforms(ge).registerInternalVariables(z).declareVariables(...we,L)}
  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${p})) * ${p};
    var index1 = global_idx / (uniforms.N / ${p});
    let stride1 = uniforms.M / ${h};
    let row = (index1 % stride1) * ${h};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${z.offsetToIndices("batch")};`}

    var a_indices: ${D.type.indices};
    ${ca("a_indices",D,D.rank-2,z.rank,"batch_indices")}
    ${D.indicesSet("a_indices",D.rank-2,0)}
    ${D.indicesSet("a_indices",D.rank-1,0)}
    let a_offset = ${D.indicesToOffset("a_indices")};

    var b_indices: ${B.type.indices};
    ${ca("b_indices",B,B.rank-2,z.rank,"batch_indices")}
    ${B.indicesSet("b_indices",B.rank-2,0)}
    ${B.indicesSet("b_indices",B.rank-1,0)}
    let b_offset = ${B.indicesToOffset("b_indices")};
    var values: array<${L.type.value}, ${h}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${f}) {
      ${qe()}
    }
    for (var i = 0u; i < ${h}u; i++) {
      var value = values[i];
      ${ue}
      ${ee}
      let cur_indices = ${L.type.indices}(batch, row + i, col);
      let offset = ${L.indicesToOffset("cur_indices")};
      ${L.setByOffset(`offset / ${p}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${p};${f};${h};${a}`,inputDependencies:y?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:_}),getShaderSource:T}}}),du,pu,wn,bn,cu,$n,fu,Ba,vn=E(()=>{$e(),fe(),de(),ti(),_n(),gn(),du=(e,t)=>e?`
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
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${yt(e,l)} {
      var value = ${yt(e,l)}(0.0);
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

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${n.type.indices}) -> ${yt(e,l)} {
      var value = ${yt(e,l)}(0.0);
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
    `},Ba=(e,t,r,i,a=!1,n)=>{let s=e[0].dims,o=e[1].dims,u=s.slice(0,-2),l=o.slice(0,-2),d=i?i.slice(0,-2):r.slice(0,-2),p=U.size(d),f=s[s.length-2],h=s[s.length-1],m=o[o.length-1],y=h%4===0&&m%4===0,$=f<=8?[4,1,1]:[4,4,1],w=[8,8,1],_=[Math.ceil(m/w[0]/$[0]),Math.ceil(f/w[1]/$[1]),Math.ceil(p/w[2]/$[2])],T=y?4:1,x=[...u,f,h/T],z=x.length,D=[...l,h,m/T],B=D.length,L=[p,f,m/T],q=[{type:6,data:f},{type:6,data:m},{type:6,data:h}];Jr(t,q),q.push(...k(d,x,D));let ee=["rank","rank"],we=e.length>2;we&&(q.push(...k(e[2].dims)),ee.push("rank")),q.push(...k(L));let ue=ge=>{let qe=d.length,ke=Ee("batchDims",e[0].dataType,qe,1),he=R(e[0].dataType),ze=A("a",e[0].dataType,z,T),pe=A("b",e[1].dataType,B,T),Se=X("result",e[0].dataType,L.length,T),wt=[ze,pe];if(we){let Pt=a?T:1;wt.push(A("bias",e[2].dataType,e[2].dims.length,Pt))}let G=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];ei(t,G);let te=R(Se.type.tensor),me=Yr(t,Se.type.value,te),Oe=fu(T,we,me,[ke,ze,pe,Se],a);return`
  ${ge.registerUniforms(G).registerInternalVariables(ke).declareVariables(...wt,Se)}
  ${Oe}
  ${y?wn($,w,he,ke):$n($,w,he,ke)}
                   `};return{name:"MatMul",shaderCache:{hint:`${$};${t.activation};${y};${a}`,inputDependencies:ee},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:_[0],y:_[1],z:_[2]},programUniforms:q}),getShaderSource:ue}}}),hu,mu,Mc=E(()=>{$e(),Bt(),de(),ti(),gn(),Rc(),vn(),hu=(e,t,r,i,a=!1,n,s=4,o=4,u=4,l="f32")=>{let d=q=>{switch(q){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${q} is not supported.`)}},p=q=>{switch(q){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${q} is not supported.`)}},f=e?`
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
    return resData;`,T=e?t&&i?`
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
    return ${yt(o,l)}(0.0);`,z=yt(u,l),D=yt(e?s:o,l),B=yt(e?o:s,l),L=Yr(n,z,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${D} {
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
    }`},mu=(e,t,r,i,a,n,s,o,u)=>{let l=t.format==="NHWC",d=l?e[0].dims[3]:e[0].dims[1],p=r[0],f=l?r[2]:r[3],h=l?r[1]:r[2],m=l?r[3]:r[1],y=l&&(d%4===0||d%3===0)&&m%4===0,$=l?m:f*h,w=l?f*h:m,_=[8,8,1],T=i<=8?[4,1,1]:[4,4,1],x=[Math.ceil($/_[0]/T[0]),Math.ceil(w/_[1]/T[1]),Math.ceil(p/_[2]/T[2])];Re("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${x}`);let z=y?l&&d%4!==0?3:4:1,D=_[1]*T[1],B=_[0]*T[0],L=Math.max(_[0]*z,_[1]),q=i%D===0,ee=a%B===0,we=n%L===0,ue=y?[z,4,4]:[1,1,1],ge=[{type:6,data:i},{type:6,data:a},{type:6,data:n},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Jr(t,ge),ge.push(...k(e[0].dims,e[1].dims));let qe=["rank","rank"];s&&(ge.push(...k(e[2].dims)),qe.push("rank")),ge.push(...k(r));let ke=he=>{let ze=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];ei(t,ze);let pe=y?4:1,Se=R(e[0].dataType),wt=`
      fn setOutputAtIndex(flatIndex : i32, value : ${y?`vec4<${Se}>`:Se}) {
        result[flatIndex] = ${y?`vec4<${Se}>`:Se}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${y?`vec4<${Se}>`:Se}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${y?"/ 4":""}, value);
      }`,G=A("x",e[0].dataType,e[0].dims.length,z===3?1:z),te=A("w",e[1].dataType,e[1].dims.length,pe),me=[G,te],Oe=X("result",e[0].dataType,r.length,pe);if(s){let Pt=A("bias",e[2].dataType,e[2].dims.length,pe);me.push(Pt),wt+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${y?`vec4<${Se}>`:Se} {
          return bias[coords.${l?"w":"y"}${y?"/ 4":""}];
        }`}return`
        ${lu("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${he.registerUniforms(ze).declareVariables(...me,Oe)}
        ${wt}
        ${hu(l,q,ee,we,s,t,ue[0],ue[1],ue[2],Se)}
        ${y?wn(T,_,Se,void 0,!l,L):$n(T,_,Se,void 0,!l,L,!1,void 0,o)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${z};${y};${q};${ee};${we};${D};${B};${L}`,inputDependencies:qe},getRunData:()=>({outputs:[{dims:u?u(r):r,dataType:e[0].dataType}],dispatchGroup:{x:x[0],y:x[1],z:x[2]},programUniforms:ge}),getShaderSource:ke}}}),gu,xn,fa,yu,Sn,_u,wu,bu,Bc=E(()=>{$e(),Bt(),fe(),de(),ti(),gn(),gu=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},xn=e=>typeof e=="number"?[e,e,e]:e,fa=(e,t)=>t<=1?e:e+(e-1)*(t-1),yu=(e,t,r,i=1)=>{let a=fa(t,i);return Math.floor((e[0]*(r-1)-r+a)/2)},Sn=(e,t,r,i,a)=>{a==null&&(a=yu(e,t[0],i[0]));let n=[0,0,0,r];for(let s=0;s<3;s++)e[s]+2*a>=t[s]&&(n[s]=Math.trunc((e[s]-t[s]+2*a)/i[s]+1));return n},_u=(e,t,r,i,a,n,s,o,u,l)=>{let d,p,f,h;if(e==="VALID"&&(e=0),typeof e=="number"){d={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=Sn([t,r,i,1],[o,u,l],1,[a,n,s],e);p=m[0],f=m[1],h=m[2]}else if(Array.isArray(e)){if(!e.every((y,$,w)=>y===w[0]))throw Error(`Unsupported padding parameter: ${e}`);d={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=Sn([t,r,i,1],[o,u,l],1,[a,n,s],e[0]);p=m[0],f=m[1],h=m[2]}else if(e==="SAME_UPPER"){p=Math.ceil(t/a),f=Math.ceil(r/n),h=Math.ceil(i/s);let m=(p-1)*a+o-t,y=(f-1)*n+u-r,$=(h-1)*s+l-i,w=Math.floor(m/2),_=m-w,T=Math.floor(y/2),x=y-T,z=Math.floor($/2),D=$-z;d={top:T,bottom:x,left:z,right:D,front:w,back:_}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:d,outDepth:p,outHeight:f,outWidth:h}},wu=(e,t,r,i,a,n=!1,s="channelsLast")=>{let o,u,l,d,p;if(s==="channelsLast")[o,u,l,d,p]=e;else if(s==="channelsFirst")[o,p,u,l,d]=e;else throw new Error(`Unknown dataFormat ${s}`);let[f,,h,m,y]=t,[$,w,_]=xn(r),[T,x,z]=xn(i),D=fa(h,T),B=fa(m,x),L=fa(y,z),{padInfo:q,outDepth:ee,outHeight:we,outWidth:ue}=_u(a,u,l,d,$,w,_,D,B,L),ge=n?f*p:f,qe=[0,0,0,0,0];return s==="channelsFirst"?qe=[o,ge,ee,we,ue]:s==="channelsLast"&&(qe=[o,ee,we,ue,ge]),{batchSize:o,dataFormat:s,inDepth:u,inHeight:l,inWidth:d,inChannels:p,outDepth:ee,outHeight:we,outWidth:ue,outChannels:ge,padInfo:q,strideDepth:$,strideHeight:w,strideWidth:_,filterDepth:h,filterHeight:m,filterWidth:y,effectiveFilterDepth:D,effectiveFilterHeight:B,effectiveFilterWidth:L,dilationDepth:T,dilationHeight:x,dilationWidth:z,inShape:e,outShape:qe,filterShape:t}},bu=(e,t,r,i,a,n)=>{let s=n==="channelsLast";s?e[0].dims[3]:e[0].dims[1];let o=[64,1,1],u={x:r.map(($,w)=>w)},l=[Math.ceil(gu(u.x.map($=>r[$]))/o[0]),1,1];Re("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let d=1,p=U.size(r),f=[{type:12,data:p},{type:12,data:i},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];Jr(t,f),f.push(...k(e[0].dims,e[1].dims));let h=["rank","rank"],m=e.length===3;m&&(f.push(...k(e[2].dims)),h.push("rank")),f.push(...k(r));let y=$=>{let w=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:i.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];ei(t,w);let _=1,T=R(e[0].dataType),x=A("x",e[0].dataType,e[0].dims.length,d),z=A("W",e[1].dataType,e[1].dims.length,_),D=[x,z],B=X("result",e[0].dataType,r.length,_),L="";if(m){let we=A("bias",e[2].dataType,e[2].dims.length,_);D.push(we),L+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${T} {
          return bias[${s?P("coords",4,5):P("coords",1,5)}];
        }`}let q=yt(d,T),ee=Yr(t,q,T);return`
            ${L}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${x.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${z.getByIndices("aIndices")};
            }
          ${$.registerUniforms(w).declareVariables(...D,B)}
          ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${B.offsetToIndices("global_idx")};
              let batch = ${P("coords",0,x.rank)};
              let d2 = ${s?P("coords",x.rank-1,x.rank):P("coords",1,x.rank)};
              let xFRCCorner = vec3<u32>(${s?P("coords",1,x.rank):P("coords",2,x.rank)},
              ${s?P("coords",2,x.rank):P("coords",3,x.rank)},
              ${s?P("coords",3,x.rank):P("coords",4,x.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?P("uniforms.x_shape",1,x.rank):P("uniforms.x_shape",2,x.rank)};
              let xShapeZ = ${s?P("uniforms.x_shape",2,x.rank):P("uniforms.x_shape",3,x.rank)};
              let xShapeW = ${s?P("uniforms.x_shape",3,x.rank):P("uniforms.x_shape",4,x.rank)};
              let xShapeU = ${s?P("uniforms.x_shape",4,x.rank):P("uniforms.x_shape",1,x.rank)};
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
              ${ee}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${d};${m}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:f}),getShaderSource:y}}}),$u,vu,Dc=E(()=>{$e(),fe(),de(),ti(),$u=(e,t,r,i)=>{let a=e.length>2,n=a?"value += b[output_channel];":"",s=e[0].dims,o=e[1].dims,u=t.format==="NHWC",l=u?r[3]:r[1],d=l/t.group,p=u&&d>=4?M(l):1,f=U.size(r)/p,h=[{type:12,data:f},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:d}];Jr(t,h),h.push(...k(s,[o[0],o[1],o[2],o[3]/p]));let m=a?["rank","rank","rank"]:["rank","rank"];h.push(...k([r[0],r[1],r[2],r[3]/p]));let y=$=>{let w=X("output",e[0].dataType,r.length,p),_=R(w.type.tensor),T=Yr(t,w.type.value,_),x=A("x",e[0].dataType,s.length),z=A("w",e[1].dataType,o.length,p),D=[x,z];a&&D.push(A("b",e[2].dataType,e[2].dims,p));let B=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];ei(t,B);let L=u?`
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
  ${$.registerUniforms(B).declareVariables(...D,w)}

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
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${p}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:h}),getShaderSource:y}},vu=(e,t,r,i)=>{let a=e.length>2,n=M(r[3]),s=M(r[2]),o=U.size(r)/n/s,u=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/n],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/n],d=[r[0],r[1],r[2],r[3]/n],p=[{type:12,data:o},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Jr(t,p),p.push(...k(u,l,d));let f=(s-1)*t.strides[1]+l[1],h=m=>{let y=X("output",e[0].dataType,d.length,n),$=R(y.type.tensor),w=Yr(t,y.type.value,$),_=A("x",e[0].dataType,u.length,n),T=A("w",e[1].dataType,l.length,n),x=[_,T];a&&x.push(A("b",e[2].dataType,e[2].dims,n));let z=a?"value += b[output_channel];":"",D=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return ei(t,D),`
  ${m.registerUniforms(D).declareVariables(...x,y)}
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
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${n};${s};${f};${l[0]};${l[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:p}),getShaderSource:h}}}),xu,Da,Su,Pa,Tn,En,Tu,Eu,In,Pc=E(()=>{fe(),Mc(),Bc(),vn(),Dc(),ti(),_n(),gt(),xu=(e,t,r,i,a,n)=>{let s=e[0],o=e.slice(n?1:2,n?3:4),u=o.length,l=t[0],d=t.slice(2).map((f,h)=>f+(f-1)*(r[h]-1)),p=o.map((f,h)=>f+i[h]+i[h+u]).map((f,h)=>Math.floor((f-d[h]+a[h])/a[h]));return p.splice(0,0,s),p.splice(n?3:1,0,l),p},Da=[2,3,1,0],Su=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[1]*t.group;if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Pa=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let n=2;n<t[1].dims.length;++n)r[n-2]===0&&(r[n-2]=t[1].dims[n]);let i=e.pads.slice();hr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,i,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:i}),a},Tn=e=>{let t=mn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,n=e.group,s=e.kernel_shape,o=e.pads,u=e.strides,l=e.w_is_const();return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},En=(e,t,r,i)=>{let a=r.format==="NHWC",n=xu(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let D=[t[0]];if(a){let B=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=B),D.push(B)}else D.push(t[1]);t.length===3&&D.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(vu(D,r,n,i),{inputs:D}):e.compute($u(D,r,n,i),{inputs:D});return}let s=t.length===3,o=t[0].dims[a?1:2],u=t[0].dims[a?2:3],l=t[0].dims[a?3:1],d=t[1].dims[2],p=t[1].dims[3],f=n[a?1:2],h=n[a?2:3],m=n[a?3:1],y=a&&d===o&&p===u&&r.pads[0]===0&&r.pads[1]===0;if(y||d===1&&p===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let D=n[0],B,L,q,ee=[];if(a){let ge=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=ge),y){let qe=o*u*l;B=t[0].reshape([1,D,qe]),L=ge.reshape([1,qe,m]),q=[1,D,m]}else B=t[0].reshape([D,o*u,l]),L=ge.reshape([1,l,m]),q=[D,f*h,m];ee.push(B),ee.push(L)}else B=t[0].reshape([D,l,o*u]),L=t[1].reshape([1,m,l]),q=[D,m,f*h],ee.push(L),ee.push(B);s&&ee.push(t[2]);let we=q[2],ue=ee[0].dims[ee[0].dims.length-1];we<8&&ue<8?e.compute(yn(ee,r,n,q,a,i),{inputs:ee}):e.compute(Ba(ee,r,n,q,a,i),{inputs:ee});return}let $=!0,w=e.kernelCustomData.wT??e.compute(bt(t[1],Da),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=w);let _=[t[0],w];s&&_.push(t[2]);let T=a?f*h:m,x=a?m:f*h,z=d*p*l;e.compute(mu(_,r,n,T,x,z,s,$,i),{inputs:_})},Tu=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],n=[1].concat(t.strides),s=[1].concat(t.dilations),o=[1].concat(t.kernelShape),u=Pa({...t,pads:a,strides:n,dilations:s,kernelShape:o},i);En(e,i,u,l=>r?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},Eu=(e,t,r)=>{let i=r.format==="NHWC"?"channelsLast":"channelsFirst",a=Pa(r,t),n=r.autoPad==="NOTSET"?r.pads:r.autoPad,s=wu(t[0].dims,t[1].dims,r.strides,r.dilations,n,!1,i);e.compute(bu(t,a,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],i))},In=(e,t)=>{if(Su(e.inputs,t),e.inputs[0].dims.length===3)Tu(e,t);else if(e.inputs[0].dims.length===5)Eu(e,e.inputs,t);else{let r=Pa(t,e.inputs);En(e,e.inputs,r)}}}),Iu,Uc=E(()=>{$e(),Bt(),fe(),de(),Iu=(e,t,r)=>{let i=e.length>2,a=t.outputShape,n=t.format==="NHWC",s=t.group,o=e[1].dims,u=o[2]/s,l=o[3],d=n?M(u):1,p=n&&l===1&&u>=4,f=p?Math.floor(u/4)*4:Math.floor(u/d)*d,h=u-f,m=n?M(l):1,y=n?l===1?d:m:1,$=U.size(a)/m,w=[Math.ceil($/64),1,1];Re("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${w}`);let _=["rank","rank"],T=[t.strides[0],t.strides[1]],x=[t.kernelShape[n?1:2],t.kernelShape[n?2:3]],z=[t.dilations[0],t.dilations[1]],D=[x[0]+(t.dilations[0]<=1?0:(t.kernelShape[n?1:2]-1)*(t.dilations[0]-1)),x[1]+(t.dilations[1]<=1?0:(t.kernelShape[n?2:3]-1)*(t.dilations[1]-1))],B=[D[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),D[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],L=[{type:12,data:$},{type:12,data:T},{type:12,data:x},{type:12,data:z},{type:12,data:D},{type:6,data:B},{type:12,data:f},{type:12,data:u},{type:12,data:l},...k(e[0].dims,e[1].dims)];i&&(L.push(...k(e[2].dims)),_.push("rank")),L.push(...k(a));let q=ee=>{let we=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:T.length},{name:"filter_dims",type:"u32",length:x.length},{name:"dilations",type:"u32",length:x.length},{name:"effective_filter_dims",type:"u32",length:D.length},{name:"pads",type:"i32",length:B.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],ue=R(e[0].dataType),ge=n?1:2,qe=n?2:3,ke=n?3:1,he=A("W",e[1].dataType,e[1].dims.length,y),ze=A("Dy",e[0].dataType,e[0].dims.length,d),pe=[ze,he];i&&pe.push(A("bias",e[2].dataType,[a[ke]].length,m));let Se=X("result",e[0].dataType,a.length,m),wt=()=>{let me="";if(p)d===4?me+=`
        let xValue = ${ze.getByOffset("x_offset")};
        let wValue = ${he.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:d===2?me+=`
          dotProd = dotProd + dot(vec4<${ue}>(${ze.getByOffset("x_offset")}, ${ze.getByOffset("x_offset + 1u")}), vec4<${ue}>(${he.getByOffset("w_offset")}, ${he.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:d===1&&(me+=`
          dotProd = dotProd + dot(vec4<${ue}>(${ze.getByOffset("x_offset")}, ${ze.getByOffset("x_offset + 1u")}, ${ze.getByOffset("x_offset + 2u")}, ${ze.getByOffset("x_offset + 3u")}), vec4<${ue}>(${he.getByOffset("w_offset")}, ${he.getByOffset("w_offset + 1u")}, ${he.getByOffset("w_offset + 2u")}, ${he.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(me+=`
                  let xValue = ${n?ze.getByOffset(`${ze.indicesToOffset(`${ze.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d}`):ze.get("batch","inputChannel","idyR","idyC")};
        `,d===1)me+=`
          let w_offset = ${he.indicesToOffset(`${he.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${he.getByOffset(`w_offset / ${y}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let Oe=0;Oe<d;Oe++)me+=`
            let wValue${Oe} = ${he.getByOffset(`${he.indicesToOffset(`${he.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${Oe}, wOutChannel)`)} / ${y}`)};
            dotProd = dotProd + xValue[${Oe}] * wValue${Oe};`;return me},G=()=>{if(h===0)return"";if(!p)throw new Error(`packInputAs4 ${p} is not true.`);let me="";if(d===1){me+="dotProd = dotProd";for(let Oe=0;Oe<h;Oe++)me+=`
            + ${ze.getByOffset(`x_offset + ${Oe}`)} * ${he.getByOffset(`w_offset + ${Oe}`)}`;me+=";"}else if(d===2){if(h!==2)throw new Error(`Invalid inputChannelsRemainder ${h}.`);me+=`
          let xValue = ${ze.getByOffset("x_offset")};
          let wValue = ${he.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return me},te=`
            let outputIndices = ${Se.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${Se.indicesGet("outputIndices",0)};
            let d1 = ${Se.indicesGet("outputIndices",ke)};
            let r = ${Se.indicesGet("outputIndices",ge)};
            let c = ${Se.indicesGet("outputIndices",qe)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${Se.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${ue}(dyRCorner) + ${ue}(wR)) / ${ue}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${ue}(uniforms.Dy_shape[${ge}]) || fract(dyR) > 0.0 ||
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
                let dyC = (${ue}(dyCCorner) + ${ue}(wC)) / ${ue}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${ue}(uniforms.Dy_shape[${qe}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${p?`
                var x_offset = ${ze.indicesToOffset(`${ze.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d};
                var w_offset = ${he.indicesToOffset(`${he.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${y};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${p?4:d}) {
                  ${wt()}
                  inputChannel = inputChannel + ${p?4:d};
                }
                ${G()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${i?` + bias[d1 / ${m}]`:""};
            ${Se.setByOffset("global_idx","value")};
          `;return`
    ${ee.registerUniforms(we).declareVariables(...pe,Se)}
      ${ee.mainStart()}
      ${ee.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${te}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${d}${y}${m}${p}${h}`,inputDependencies:_},getRunData:()=>({dispatchGroup:{x:w[0],y:w[1],z:w[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:L}),getShaderSource:q}}}),ku,Cu,zu,kn,Au,Ou,Cn,Ru,Mu,Nc=E(()=>{Uc(),ti(),gt(),ku=(e,t,r,i,a,n)=>(e-1)*t+r+(i-1)*a+1-n,Cu=(e,t,r,i,a)=>{let n=Math.floor(e/2);t==="SAME_UPPER"?(r[i]=n,r[a]=e-n):t==="SAME_LOWER"&&(r[i]=e-n,r[a]=n)},zu=(e,t,r,i,a,n,s,o,u,l)=>{let d=e.length-2,p=l.length===0;u.length<d&&u.push(...Array(d-u.length).fill(0));let f=e[0],h=t[o?3:1]*a;for(let m=0,y=e.length-d-(o?1:0);m<d;++m,++y){let $=e[y],w=p?$*s[m]:l[m],_=ku($,s[m],n[m],t[y],r[m],w);Cu(_,i,n,m,m+d),p&&l.push(s[m]*($-1)+u[m]+(t[y]-1)*r[m]+1-n[m]-n[m+d])}l.splice(0,0,f),l.splice(o?3:1,0,h)},kn=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((p,f)=>p*f,1)===0){r.length=0;for(let p=2;p<t[1].dims.length;++p)r.push(t[1].dims[p])}let i=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(i?3:1,0,t[1].dims[1]);let a=e.pads.slice(),n=e.outputShape.slice(),s=e.outputPadding.slice(),o=t[0].dims,u=e.dilations.slice();if(u.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;u=new Array(p).fill(1)}let l=e.strides.slice();if(l.reduce((p,f)=>p+f,0)===0){let p=t[0].dims.length-2;l=new Array(p).fill(1)}zu(o,r,u,e.autoPad,e.group,a,l,i,s,n);let d=Object.assign({},e);return Object.assign(d,{kernelShape:r,pads:a,outputPadding:s,outputShape:n,dilations:u,strides:l}),d},Au=e=>{let t=mn(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,n=e.group,s=e.kernelShape,o=e.pads,u=e.strides,l=e.wIsConst(),d=e.outputPadding,p=e.outputShape;return{autoPad:i,format:r,dilations:a,group:n,kernelShape:s,outputPadding:d,outputShape:p,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Ou=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[0];if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let n=e[0].dims.length-2;if(t.dilations.reduce((s,o)=>s+o,0)>0&&t.dilations.length!==n)throw new Error(`dilations should be ${n}D`);if(t.strides.reduce((s,o)=>s+o,0)>0&&t.strides.length!==n)throw new Error(`strides should be ${n}D`);if(t.pads.reduce((s,o)=>s+o,0)>0&&t.pads.length!==n*2)throw new Error(`pads should be ${n*2}D`);if(t.outputPadding.length!==n&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${n}D`);if(t.kernelShape.reduce((s,o)=>s+o,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Cn=(e,t,r,i)=>{let a=e.kernelCustomData.wT??e.compute(bt(t[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=a);let n=[t[0],a];t.length===3&&n.push(t[2]),e.compute(Iu(n,r,i),{inputs:n})},Ru=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let n=t.dilations;(n.length===0||n[0]===0)&&(n=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let o=t.pads;o.length===0&&(o=[0,0]),o=[0,o[0],0,o[1]],s=[1].concat(s),n=[1].concat(n),a=[1].concat(a);let u=t.outputPadding;u=[0].concat(u);let l=kn({...t,pads:o,strides:s,dilations:n,kernelShape:a,outputPadding:u},i);Cn(e,i,l,d=>r?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Mu=(e,t)=>{if(Ou(e.inputs,t),e.inputs[0].dims.length===3)Ru(e,t);else{let r=kn(t,e.inputs);Cn(e,e.inputs,r)}}}),Bu,Du,Pu,Lc=E(()=>{$e(),fe(),b(),de(),Bu=(e,t,r,i)=>{let a=U.size(t),n=t.length,s=A("input",e,n),o=X("output",e,n),u=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),l=U.normalizeAxis(u,n),d=p=>{let f=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,h=P("uniforms.input_shape","uniforms.axis",n),m=i.reverse?f+(i.exclusive?" + 1":""):"0",y=i.reverse?h:f+(i.exclusive?"":" + 1");return`
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
                }`};return{name:"CumSum",shaderCache:{hint:i.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:l},...k(t,t)]}),getShaderSource:d}},Du=(e,t)=>{let r=e.inputs[0].dims,i=e.inputs[0].dataType,a=e.inputs[1];e.compute(Bu(i,r,a,t),{inputs:[0]})},Pu=e=>{let t=e.exclusive===1,r=e.reverse===1;return g({exclusive:t,reverse:r})}}),Uu,Nu,Lu,Vu,qu,Vc=E(()=>{$e(),fe(),b(),de(),Uu=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},Nu=(e,t,r,i)=>{let a=[];a.push(`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let n=0;n<t;++n)a.push(r.indicesSet("a",e[n],`i[${n}]`));return a.push("return a;}"),a.join(`
`)},Lu=(e,t)=>{let r,i,a,n,s,o,u=t.format==="NHWC",l=t.blocksize,d=t.mode==="DCR";u?([r,i,a,n]=e.dims,s=d?[r,i,a,l,l,n/l**2]:[r,i,a,n/l**2,l,l],o=d?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,i,a,n]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=d?[r,l,l,n/l**2,i,a]:[r,n/l**2,l,l,i,a],o=d?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let p=e.reshape(s),f=p.dims.length,h=e.dataType,m=A("a",h,f),y=X("output",h,f),$=w=>`
  ${w.registerUniform("output_size","u32").declareVariables(m,y)}

  ${Nu(o,f,m,y)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${y.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${y.setByOffset("global_idx",m.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:w=>{let _=u?[r,i*l,a*l,n/l**2]:[r,n/l**2,i*l,a*l],T=U.size(_),x=p.dims,z=U.sortBasedOnPerm(x,o);return{outputs:[{dims:_,dataType:w[0].dataType}],dispatchGroup:{x:Math.ceil(T/64)},programUniforms:[{type:12,data:T},...k(x,z)]}},getShaderSource:$}},Vu=(e,t)=>{Uu(e.inputs),e.compute(Lu(e.inputs[0],t))},qu=e=>g({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Ua,ha,zn,Fu,Wu,Gu,ju,An,Hu,Ku,Zu,qc=E(()=>{$e(),fe(),b(),de(),Ua="[a-zA-Z]|\\.\\.\\.",ha="("+Ua+")+",zn="^"+ha+"$",Fu="("+ha+",)*"+ha,Wu="^"+Fu+"$",Gu=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},ju=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,i]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(Wu)))throw new Error("Invalid LHS term");if(r.split(",").forEach((n,s)=>{let o=e[s].dims.slice();if(!n.match(RegExp(zn)))throw new Error("Invalid LHS term");let u=this.processTerm(n,!0,o,s);this.lhs.push(u)}),i==="")i+=[...this.symbolToInfo.entries()].filter(([n,s])=>s.count===1||n==="...").map(([n])=>n).join("");else if(!i.match(RegExp(ha)))throw new Error("Invalid RHS");(a=i.match(RegExp(Ua,"g")))==null||a.forEach(n=>{if(n==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let s=this.symbolToInfo.get(n);if(s===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(s.dimValue)}}),this.rhs=this.processTerm(i,!1,this.outputDims)}addSymbol(e,t,r){let i=this.symbolToInfo.get(e);if(i!==void 0){if(i.dimValue!==t&&i.count!==1)throw new Error("Dimension mismatch");i.count++,i.inputIndices.push(r)}else i={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,i)}processTerm(e,t,r,i=-1){let a=r.length,n=!1,s=[],o=0;if(!e.match(RegExp(zn))&&!t&&e!=="")throw new Error("Invalid LHS term");let u=e.match(RegExp(Ua,"g")),l=new Gu(i);return u==null||u.forEach((d,p)=>{if(d==="..."){if(n)throw new Error("Only one ellipsis is allowed per input term");n=!0;let f=a-u.length+1;if(f<0)throw new Error("Ellipsis out of bounds");if(s=r.slice(o,o+f),this.hasEllipsis){if(this.ellipsisDims.length!==s.length||this.ellipsisDims.toString()!==s.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=s;else throw new Error("Ellipsis must be specified in the LHS");for(let h=0;h<s.length;h++){let m=String.fromCharCode(48+h);l.addSymbol(m,p+h),this.addSymbol(m,r[o++],i)}}else l.addSymbol(d,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(d,r[o++],i)}),l}},An=e=>e+"_max",Hu=(e,t,r,i)=>{let a=e.map(l=>l.length).map((l,d)=>A(`input${d}`,t,l)),n=U.size(i),s=X("output",t,i.length),o=[...r.symbolToInfo.keys()].filter(l=>!r.rhs.symbolToIndices.has(l)),u=l=>{let d=[],p="var prod = 1.0;",f="var sum = 0.0;",h="sum += prod;",m=[],y=[],$=[],w=[],_=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((x,z)=>{var D;if(r.rhs.symbolToIndices.has(z)){let B=(D=r.rhs.symbolToIndices.get(z))==null?void 0:D[0];B!==void 0&&r.lhs.forEach((L,q)=>{if(x.inputIndices.includes(q)){let ee=L.symbolToIndices.get(z);if(ee===void 0)throw new Error("Invalid symbol error");ee.forEach(we=>{d.push(`${a[q].indicesSet(`input${q}Indices`,we,s.indicesGet("outputIndices",B))}`)})}})}else r.lhs.forEach((B,L)=>{if(x.inputIndices.includes(L)){let q=B.symbolToIndices.get(z);if(q===void 0)throw new Error("Invalid symbol error");q.forEach(ee=>{m.push(`${a[L].indicesSet(`input${L}Indices`,ee,`${z}`)}`)}),w.push(`prod *= ${a[L].getByIndices(`input${L}Indices`)};`)}}),y.push(`for(var ${z}: u32 = 0; ${z} < uniforms.${An(z)}; ${z}++) {`),$.push("}")});let T=_?[...d,`let sum = ${a.map((x,z)=>x.getByIndices(`input${z}Indices`)).join(" * ")};`]:[...d,f,...y,...m,p,...w,h,...$];return`
            ${l.registerUniforms(o.map(x=>({name:`${An(x)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,s)}

            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${s.offsetToIndices("global_idx")};
            ${a.map((x,z)=>`var input${z}Indices: ${a[z].type.indices};`).join(`
`)}
            ${T.join(`
`)};
            ${s.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let l=o.filter(p=>r.symbolToInfo.has(p)).map(p=>{var f;return{type:12,data:((f=r.symbolToInfo.get(p))==null?void 0:f.dimValue)||0}});l.push({type:12,data:n});let d=e.map((p,f)=>[...k(p)]).reduce((p,f)=>p.concat(f),l);return d.push(...k(i)),{outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:d}},getShaderSource:u}},Ku=(e,t)=>{let r=new ju(e.inputs,t.equation),i=r.outputDims,a=e.inputs.map((n,s)=>n.dims);e.compute(Hu(a,e.inputs[0].dataType,r,i))},Zu=e=>{let t=e.equation.replace(/\s+/g,"");return g({equation:t})}}),Qu,On,Xu,Yu,Ju,Fc=E(()=>{$e(),fe(),de(),Qu=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;i<r.length&&a<t.length;++i,++a)if(r[i]!==t[a]&&r[i]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},On=(e,t)=>{let r=e.length-t.length,i=[];for(let a=0;a<r;++a)i.push(e[a]);for(let a=0;a<t.length;++a)i.push(t[a]===1?e[a+r]:t[a]);return i},Xu=(e,t)=>e.length>t.length?On(e,t):On(t,e),Yu=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=Xu(t,r),a=e[0].dataType,n=a===9||U.size(t)===1,s=a===9||t.length>0&&t[t.length-1]%4===0?4:1,o=n||i.length>0&&i[i.length-1]%4===0?4:1,u=Math.ceil(U.size(i)/o),l=p=>{let f=A("input",a,t.length,s),h=X("output",a,i.length,o),m;if(a===9){let y=($,w,_="")=>`
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
    ${m}`},d=[{type:12,data:u},...k(t,i)];return{name:"Expand",shaderCache:{hint:`${i.length};${s}${o}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d})}},Ju=e=>{Qu(e.inputs),e.compute(Yu(e.inputs),{inputs:[0]})}}),el,tl,Wc=E(()=>{$e(),fe(),de(),hn(),el=e=>{let t=e[0].dataType,r=U.size(e[0].dims),i=U.size(e[1].dims),a=i%4===0,n=s=>{let o=A("x",t,[1],4),u=A("bias",t,[1],4),l=X("y",t,[1],4),d=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],p=h=>`
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
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:n,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:i}],dispatchGroup:{x:Math.ceil(r/I/4)}})}},tl=e=>{e.inputs.length<2||U.size(e.inputs[1].dims)===0?Bo(e):e.compute(el(e.inputs))}}),rl,il,al,nl,Gc=E(()=>{$e(),fe(),b(),de(),rl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},il=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=U.normalizeAxis(t.axis,a),s=r.slice(0);s.splice(n,1,...i);let o=r[n],u=e[0].dataType===9?4:1,l=Math.ceil(U.size(s)/u),d=[{type:12,data:l},{type:6,data:o},{type:12,data:n},...k(e[0].dims,e[1].dims,s)],p=f=>{let h=A("data",e[0].dataType,e[0].dims.length,u),m=A("inputIndices",e[1].dataType,e[1].dims.length),y=X("output",e[0].dataType,s.length,u),$=_=>{let T=i.length,x=`var indicesIndices${_}  = ${m.type.indices}(0);`;for(let z=0;z<T;z++)x+=`${T>1?`indicesIndices${_}[${z}]`:`indicesIndices${_}`} = ${s.length>1?`outputIndices${_}[uniforms.axis + ${z}]`:`outputIndices${_}`};`;x+=`
          var idx${_} = ${m.getByIndices(`indicesIndices${_}`)};
          if (idx${_} < 0) {
            idx${_} = idx${_} + uniforms.axisDimLimit;
          }
          var dataIndices${_} : ${h.type.indices};
        `;for(let z=0,D=0;z<a;z++)z===n?(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = u32(idx${_});`,D+=T):(x+=`${a>1?`dataIndices${_}[${z}]`:`dataIndices${_}`} = ${s.length>1?`outputIndices${_}[${D}]`:`outputIndices${_}`};`,D++);return x},w;if(e[0].dataType===9){let _=(T,x,z="")=>`
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
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:p}},al=e=>g({axis:e.axis}),nl=(e,t)=>{let r=e.inputs;rl(r),e.compute(il(e.inputs,t))}}),sl,ol,ul,jc=E(()=>{$e(),fe(),de(),sl=(e,t,r,i,a,n,s,o,u)=>{let l=[{type:12,data:n},{type:12,data:i},{type:12,data:a},{type:12,data:r},{type:12,data:s},{type:12,data:o},{type:12,data:u}],d=[n];l.push(...k(t.dims,d));let p=f=>{let h=A("indices_data",t.dataType,t.dims.length),m=X("input_slice_offsets_data",12,1,1),y=[h,m],$=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:a.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
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
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${a.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:l}),getShaderSource:p},{inputs:[t],outputs:[-1]})[0]},ol=(e,t)=>{let r=e.inputs,i=r[0].dims,a=r[0].dataType,n=r[1].dims,s=n[n.length-1],o=U.sizeToDimension(n,n.length-1),u=U.sizeFromDimension(i,t.batchDims+s),l=U.sizeToDimension(i,t.batchDims),d=U.sizeFromDimension(i,t.batchDims),p=o/l,f=new Array(s),h=u;for(let x=0;x<s;++x)f[s-1-x]=h,h*=i[t.batchDims+s-1-x];let m=sl(e,r[1],f,t.batchDims,i,o,p,d,s),y=t.batchDims+s;if(y>i.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let $=n.slice(0,-1).concat(i.slice(y)),w=U.size($),_=[{type:12,data:w},{type:12,data:u},...k(r[0].dims,m.dims,$)],T=x=>{let z=A("data",r[0].dataType,r[0].dims.length),D=A("slice_offsets",12,m.dims.length),B=X("output",r[0].dataType,$.length);return`
          ${x.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(z,D,B)}
            ${x.mainStart()}
            ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:$,dataType:a}],dispatchGroup:{x:Math.ceil(w/64)},programUniforms:_}),getShaderSource:T},{inputs:[r[0],m]})},ul=e=>({batchDims:e.batch_dims,cacheKey:""})}),ll,dl,pl,cl,Hc=E(()=>{$e(),fe(),b(),de(),ll=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=U.normalizeAxis(t.quantizeAxis,e[0].dims.length),i=t.blockSize,a=e[0],n=e[2],s=e.length===4?e[3]:void 0;if(n.dims.length!==a.dims.length||!a.dims.map((o,u)=>u===r?Math.ceil(o/i)===n.dims[u]:o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==n.dims.length||!s.dims.map((o,u)=>o===n.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},dl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,n=U.normalizeAxis(t.gatherAxis,a),s=U.normalizeAxis(t.quantizeAxis,a),o=r.slice(0);o.splice(n,1,...i);let u=U.size(o),l=e[2].dataType,d=e[0].dataType===22,p=[{type:12,data:u},{type:12,data:s},{type:12,data:n},{type:12,data:t.blockSize},...k(...e.map((h,m)=>h.dims),o)],f=h=>{let m=A("data",e[0].dataType,e[0].dims.length),y=A("inputIndices",e[1].dataType,e[1].dims.length),$=A("scales",e[2].dataType,e[2].dims.length),w=e.length>3?A("zeroPoint",e[3].dataType,e[3].dims.length):void 0,_=X("output",l,o.length),T=[m,y,$];w&&T.push(w);let x=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
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
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((h,m)=>m!==1).map(h=>h.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(h,m)=>"rank")},getRunData:()=>({outputs:[{dims:o,dataType:l}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:f}},pl=(e,t)=>{let r=e.inputs;ll(r,t),e.compute(dl(e.inputs,t))},cl=e=>g({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),fl,hl,ml,gl,Kc=E(()=>{$e(),fe(),b(),de(),fl=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},hl=(e,t)=>{let r=e[0].dims,i=e[0].dataType,a=r.length,n=e[1].dims,s=e[1].dataType,o=U.normalizeAxis(t.axis,a),u=r[o],l=n.slice(0),d=U.size(l),p=A("input",i,a),f=A("indicesInput",s,n.length),h=X("output",i,l.length),m=[{type:12,data:d},{type:6,data:u},{type:12,data:o}];return m.push(...k(r,n,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:m}),getShaderSource:y=>`
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
  }`}},ml=e=>g({axis:e.axis}),gl=(e,t)=>{let r=e.inputs;fl(r),e.compute(hl(e.inputs,t))}}),yl,_l,wl,bl,Zc=E(()=>{$e(),fe(),de(),yl=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},_l=(e,t)=>{let r=e[0].dims.slice(),i=e[1].dims.slice(),[a,n,s]=yi.getShapeOfGemmResult(r,t.transA,i,t.transB,e.length===3?e[2].dims:void 0),o=[a,n];if(!o)throw new Error("Can't use gemm on the given tensors");let u=16,l=Math.ceil(n/u),d=Math.ceil(a/u),p=!0,f=U.size(o),h=[{type:12,data:p?l:f},{type:12,data:a},{type:12,data:n},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],m=["type","type"];e.length===3&&(h.push(...k(e[2].dims)),m.push("rank")),h.push(...k(o));let y=w=>{let _="";t.transA&&t.transB?_="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?_="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?_="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(_="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let T=t.alpha===1?"":"value *= uniforms.alpha;",x=A("a",e[0].dataType,e[0].dims),z=A("b",e[1].dataType,e[1].dims),D=x.type.value,B=null,L=[x,z];e.length===3&&(B=A("c",e[2].dataType,e[2].dims.length),L.push(B));let q=X("output",e[0].dataType,o.length);L.push(q);let ee=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${w.registerUniforms(ee).declareVariables(...L)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${D}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${_}
    }

    ${T}
    ${B!=null?`let cOffset = ${B.broadcastedIndicesToOffset("vec2(m, n)",q)}; value += ${D}(uniforms.beta) * ${B.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},$=w=>{let _=A("a",e[0].dataType,e[0].dims),T=A("b",e[1].dataType,e[1].dims),x=null,z=[_,T];e.length===3&&(x=A("c",e[2].dataType,e[2].dims.length),z.push(x));let D=X("output",e[0].dataType,o.length);z.push(D);let B=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],L="",q="";t.transA&&t.transB?(q=`
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
      `,L="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(q=`
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
      `,L="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(q=`
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
      `,L="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(q=`
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
      `,L="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let ee=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${w.registerUniforms(B).declareVariables(...z)}
  var<workgroup> tile_a: array<array<${_.type.storage}, ${u}>, ${u}>;
  var<workgroup> tile_b: array<array<${T.type.storage}, ${u}>, ${u}>;
  ${w.mainStart([u,u,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${u};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${u};
    let num_tiles = (uniforms.K - 1) / ${u} + 1;
    var k_start = 0u;
    var value = ${D.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${q}
      k_start = k_start + ${u};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${u}; k++) {
        ${L}
      }
      workgroupBarrier();
    }

    ${ee}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${x!=null?`let cOffset = ${x.broadcastedIndicesToOffset("vec2(m, n)",D)}; value += ${D.type.value}(uniforms.beta) * ${x.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return p?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:l*d},programUniforms:h}),getShaderSource:$}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:h}),getShaderSource:y}},wl=e=>{let t=e.transA,r=e.transB,i=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:i,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},bl=(e,t)=>{yl(e.inputs),e.compute(_l(e.inputs,t))}}),ir,cr,ri,ii,$l,vl,xl,Sl,Tl,El,Il,kl,Cl,zl,Qc=E(()=>{$e(),fe(),b(),de(),[ir,cr,ri,ii]=[0,1,2,3],$l=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},vl=`
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
     indices[${ir}] = batch;
     indices[${cr}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
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
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${ir}], indices[${cr}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${ir}], indices[${cr}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${ir}], indices[${cr}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${ir}], indices[${cr}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${ir}], indices[${cr}], border);

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
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${ir}], indices[${cr}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,kl=(e,t)=>{let r=A("x",e[0].dataType,e[0].dims.length),i=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],a=A("grid",e[1].dataType,i.length,2),n=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(n=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[ir,cr,ri,ii]=[0,3,1,2]);let s=X("output",e[0].dataType,n.length),o=r.type.value,u=U.size(n),l=[{type:12,data:u},...k(e[0].dims,i,n)],d=p=>`
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
      var grid_indices = vec3<u32>(indices[${ir}], indices[${ri}], indices[${ii}]);
      let nxy = ${a.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${Il(s,o,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:p=>{let f=U.size(n);return{outputs:[{dims:n,dataType:p[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:l}},getShaderSource:d}},Cl=(e,t)=>{$l(e.inputs),e.compute(kl(e.inputs,t))},zl=e=>g({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),Tt,Al,Ol,Rn,Rl,ma,Ml,Bl=E(()=>{$e(),fe(),b(),$i(),dn(),de(),gt(),Tt=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,Al=(e,t)=>{let r=e[0],i=Tt(e,1),a=Tt(e,2),n=Tt(e,3),s=Tt(e,4),o=Tt(e,5),u=Tt(e,6),l=Tt(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let d=r.dims[0],p=r.dims[1],f=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],h=p,m=0,y=0,$=Math.floor(f/t.numHeads);if(u&&l&&U.size(u.dims)&&U.size(l.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==t.numHeads||u.dims[3]!==$)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==d||l.dims[1]!==t.numHeads||l.dims[3]!==$)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');m=u.dims[2],y=u.dims[2]}else if(u&&U.size(u.dims)||l&&U.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w;if(i&&U.size(i.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(i.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');w=2,h=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==$)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');w=5,h=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==$)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');w=0,h=i.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}if(n&&U.size(n.dims)>0){if(n.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(i&&i.dims.length===5&&i.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let _=m+h,T=0;if(s&&U.size(s.dims)>0){T=8;let B=s.dims;throw B.length===1?B[0]===d?T=1:B[0]===3*d+2&&(T=3):B.length===2&&B[0]===d&&B[1]===_&&(T=5),T===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let x=!1,z=f;if(a&&U.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(h!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');z=a.dims[2]}else{if(h!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');z=a.dims[1]*a.dims[3],x=!0}}let D=!1;if(s&&U.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(o&&U.size(o.dims)>0){if(o.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(o.dims[0]!==d||o.dims[1]!==t.numHeads||o.dims[2]!==p||o.dims[3]!==_)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:p,pastSequenceLength:m,kvSequenceLength:h,totalSequenceLength:_,maxSequenceLength:y,inputHiddenSize:0,hiddenSize:f,vHiddenSize:z,headSize:$,vHeadSize:Math.floor(z/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:T,scale:t.scale,broadcastResPosBias:D,passPastInKv:x,qkvFormat:w}},Ol=e=>g({...e}),Rn=g({perm:[0,2,1,3]}),Rl=(e,t,r,i,a,n,s)=>{let o=[i,a,n],u=U.size(o),l=[{type:12,data:u},{type:12,data:s},{type:12,data:n}],d=p=>{let f=X("qkv_with_bias",t.dataType,o),h=A("qkv",t.dataType,o),m=A("bias",r.dataType,o),y=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${p.registerUniforms(y).declareVariables(h,m,f)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l}),getShaderSource:d},{inputs:[t,r],outputs:[-1]})[0]},ma=(e,t,r,i,a,n,s,o)=>{let u=n;if(s&&U.size(s.dims)>0){if(i===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=Rl(e,n,s,t,i,r*a,o),u=u.reshape([t,i,r,a]),r===1||i===1?u:e.compute(bt(u,Rn.perm),{inputs:[u],outputs:[-1]})[0]}else return n.dims.length===3&&(u=n.reshape([t,i,r,a])),r===1||i===1?u:e.compute(bt(u,Rn.perm),{inputs:[u],outputs:[-1]})[0]},Ml=(e,t)=>{let r=Al(e.inputs,t),i=e.inputs[0],a=Tt(e.inputs,1),n=Tt(e.inputs,2),s=Tt(e.inputs,3),o=Tt(e.inputs,4),u=Tt(e.inputs,5),l=Tt(e.inputs,6),d=Tt(e.inputs,7);if(i.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let p=a&&n&&a.dims.length===4&&n.dims.length===4,f=ma(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,i,s,0);if(p)return da(e,f,a,n,o,void 0,l,d,u,r);if(!a||!n)throw new Error("key and value must be provided");let h=ma(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,s,r.hiddenSize),m=ma(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,n,s,2*r.hiddenSize);da(e,f,h,m,o,void 0,l,d,u,r)}}),Dl,Pl,Ul,Nl,Mn,Ll,Vl,ql=E(()=>{$e(),fe(),b(),de(),Dl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Pl=(e,t)=>{let r=[],i=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),i=r.length),g({numOutputs:i,axis:t.axis,splitSizes:r})},Ul=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${P("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,Nl=e=>{let t=e.length,r=[];for(let i=0;i<t;++i){let a=e[i].setByIndices("indices","input[global_idx]");t===1?r.push(a):i===0?r.push(`if (output_number == ${i}u) { ${a} }`):i===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${i}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},Mn=(e,t)=>{let r=e[0].dims,i=U.size(r),a=e[0].dataType,n=U.normalizeAxis(t.axis,r.length),s=new Array(t.numOutputs),o=A("input",a,r.length),u=new Array(t.numOutputs),l=[],d=[],p=0,f=[{type:12,data:i}];for(let m=0;m<t.numOutputs;m++){p+=t.splitSizes[m],u[m]=p;let y=r.slice();y[n]=t.splitSizes[m],d.push(y),s[m]=X(`output${m}`,a,y.length),l.push({dims:d[m],dataType:e[0].dataType})}f.push({type:12,data:u},...k(r,...d));let h=m=>`
  ${m.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(o,...s)}
  ${Ul(u.length)}
  ${Nl(s)}

  ${m.mainStart()}
    ${m.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${o.offsetToIndices("global_idx")};
    var index = ${o.indicesGet("indices",n)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${P("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${o.indicesSet("indices",n,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:h,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(i/64)},programUniforms:f})}},Ll=(e,t)=>{Dl(e.inputs);let r=e.inputs.length===1?t:Pl(e.inputs,t);e.compute(Mn(e.inputs,r),{inputs:[0]})},Vl=e=>{let t=e.axis,r=e.splitSizes,i=e.numOutputs<0?r.length:e.numOutputs;if(i!==r.length)throw new Error("numOutputs and splitSizes lengh must be equal");return g({axis:t,numOutputs:i,splitSizes:r})}}),Fl,Na,Wl,Gl=E(()=>{$e(),fe(),b(),de(),Fl=(e,t)=>{let[r,i,a,n]=e,{numHeads:s,rotaryEmbeddingDim:o}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!U.areEqual(i.dims,[])&&!U.areEqual(i.dims,[1])&&i.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(n.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${n.dims.length}`);if(!U.areEqual(a.dims,n.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(o>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=r.dims[0],l=r.dims[r.dims.length-2],d=a.dims[0],p=U.sizeFromDimension(r.dims,1)/l,f=o===0?a.dims[1]*2:p/s;if(o>f)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(i.dims.length===2){if(u!==i.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${i.dims[0]}`);if(l!==i.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${i.dims[1]}`)}if(f/2!==a.dims[1]&&o/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`);if(l>d)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Na=(e,t)=>{let{interleaved:r,numHeads:i,rotaryEmbeddingDim:a,scale:n}=t,s=e[0].dims[0],o=U.sizeFromDimension(e[0].dims,1),u=e[0].dims[e[0].dims.length-2],l=o/u,d=e[2].dims[1],p=a===0?d*2:l/i,f=new Array(s,u,l/p,p-d),h=U.computeStrides(f),m=[{type:1,data:n},{type:12,data:f},{type:12,data:h},...e[0].dims.length===3?new Array({type:12,data:[o,l,p,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[o,p,u*p,1]}):[],...k(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],y=$=>{let w=A("input",e[0].dataType,e[0].dims.length),_=A("position_ids",e[1].dataType,e[1].dims.length),T=A("cos_cache",e[2].dataType,e[2].dims.length),x=A("sin_cache",e[3].dataType,e[3].dims.length),z=X("output",e[0].dataType,e[0].dims.length);return $.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:f.length},{name:"global_strides",type:"u32",length:h.length},{name:"input_output_strides",type:"u32",length:h.length}]),`
        ${$.declareVariables(w,_,T,x,z)}

        ${$.mainStart(I)}
          let half_rotary_emb_dim = uniforms.${T.name}_shape[1];
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
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:g({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:y,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(U.size(f)/I)},programUniforms:m})}},Wl=(e,t)=>{Fl(e.inputs,t),e.compute(Na(e.inputs,t))}}),jl,Hl,Bn,Kl,Zl,Xc=E(()=>{b(),$e(),dn(),Bl(),ql(),gt(),Gl(),de(),jl=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=e[0],i=e[1],a=e[2],n=e[3],s=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let o=!1,u=r.dims[0],l=r.dims[1],d=r.dims.length===3?o?r.dims[2]/3:r.dims[2]:t.numHeads*r.dims[4],p=l,f=0,h=!i||i.dims.length===0,m=Math.floor(h?d/(t.numHeads+2*t.kvNumHeads):d/t.numHeads);h&&(d=m*t.numHeads);let y=n&&n.dims.length!==0,$=s&&s.dims.length!==0;if(y&&n.dims.length===4&&n.dims[0]===u&&n.dims[1]!==t.kvNumHeads&&n.dims[2]===t.kvNumHeads&&n.dims[3]===m)throw new Error("BSNH pastKey/pastValue is not supported");if(y&&$){if(n.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');f=n.dims[2]}else if(y||$)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let w=1;if(i&&i.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(r.dims[2]%i.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');p=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==m)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');p=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==m)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');p=i.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');w=3}let _=0,T=!1,x=t.kvNumHeads?m*t.kvNumHeads:d;if(a&&a.dims.length>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(p!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');x=a.dims[2]}else{if(p!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');x=a.dims[1]*a.dims[3],T=!0}}let z=e.length>4?e[5]:void 0;if(z&&z.dims.length!==1&&z.dims[0]!==u)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:u,sequenceLength:l,pastSequenceLength:f,kvSequenceLength:p,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:d,vHiddenSize:x,headSize:m,vHeadSize:Math.floor(x/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:_,scale:t.scale,broadcastResPosBias:!1,passPastInKv:T,qkvFormat:w}},Hl=g({perm:[0,2,1,3]}),Bn=(e,t,r)=>{let i=t,a=r.kvNumHeads;return t.dims.length===3&&r.kvSequenceLength!==0&&(i=t.reshape([r.batchSize,r.kvSequenceLength,a,r.headSize]),i=e.compute(bt(i,Hl.perm),{inputs:[i],outputs:[-1]})[0]),i},Kl=(e,t,r,i)=>{let a=7,n=["type","type"],s=[e*t],o=e*t,u=[{type:12,data:o},{type:12,data:t},{type:12,data:e}],l=d=>{let p=A("seq_lens",r.dataType,r.dims),f=A("total_seq_lens",i.dataType,i.dims),h=X("pos_ids",a,s),m=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
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
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:n},getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:u}),getShaderSource:l}},Zl=(e,t)=>{var x;let r=jl(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((x=e.inputs[1])==null?void 0:x.dims.length)===5)throw new Error("Packed KV is not implemented");let i=e.inputs[0],a=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,n=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,s=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,o=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,u=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,d=r.kvNumHeads?r.kvNumHeads:r.numHeads,p=g({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,d*r.headSize,d*r.headSize]}),[f,h,m]=!a&&!n?e.compute(Mn([i],p),{inputs:[i],outputs:[-1,-1,-1]}):[i,a,n],y,$;if(t.doRotary){let z=e.compute(Kl(r.batchSize,r.sequenceLength,u,l),{inputs:[u,l],outputs:[-1]})[0],D=e.inputs[7],B=e.inputs[8],L=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),q=[f,z,D,B],ee=[-1];y=e.compute(Na(q,L),{inputs:q,outputs:ee})[0],q.splice(0,1,h);let we=g({interleaved:t.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});$=e.compute(Na(q,we),{inputs:q,outputs:ee})[0]}let w=ma(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,t.doRotary?y:f,void 0,0),_=Bn(e,t.doRotary?$:h,r),T=Bn(e,m,r);da(e,w,_,T,void 0,void 0,s,o,void 0,r,u,l)}}),Dn,Ql,Xl,Yl,Yc=E(()=>{$e(),fe(),gt(),de(),Dn=(e,t,r,i,a,n,s,o)=>{let u=M(n),l=u===1?"f32":`vec${u}f`,d=u===1?"vec2f":`mat2x${u}f`,p=a*s,f=64;p===1&&(f=256);let h=[a,s,n/u],m=[a,s,2],y=["rank","type","type"],$=[];$.push(...k(h,m));let w=_=>{let T=A("x",t.dataType,3,u),x=A("scale",r.dataType,r.dims),z=A("bias",i.dataType,i.dims),D=X("output",1,3,2),B=[T,x,z,D];return`
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
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${o};${f}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:m,dataType:1}],dispatchGroup:{x:p},programUniforms:$}),getShaderSource:w},{inputs:[t,r,i],outputs:[-1]})[0]},Ql=(e,t,r)=>{let i=t[0].dims,a=i,n=2,s=i[0],o=i[1],u=U.sizeFromDimension(i,n),l=M(u),d=U.size(a)/l,p=Dn(e,t[0],t[1],t[2],s,u,o,r.epsilon),f=[s,o,u/l],h=[s,o],m=["type","none"],y=$=>{let w=A("x",t[0].dataType,f.length,l),_=A("scale_shift",1,h.length,2),T=X("output",t[0].dataType,f.length,l),x=[w,_,T];return`
  ${$.registerUniform("output_size","u32").declareVariables(...x)}
  ${$.mainStart()}
  ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${T.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${_.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${w.getByOffset("global_idx")} * ${T.type.value}(scale_shift.x) + ${T.type.value}(scale_shift.y);
      ${T.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:[{type:12,data:d},...k(f,h,f)]}),getShaderSource:y},{inputs:[t[0],p]})},Xl=(e,t,r)=>{let i=t[0].dims,a=i,n=i[0],s=i[i.length-1],o=U.sizeFromDimension(i,1)/s,u=M(s),l=U.size(a)/u,d=[{type:12,data:o},{type:12,data:Math.floor(s/u)}],p=["type","type"],f=!1,h=[0,i.length-1];for(let w=0;w<i.length-2;w++)f=f||i[w+1]!==1,h.push(w+1);f=f&&i[i.length-1]!==1;let m=f?e.compute(bt(e.inputs[0],h),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:i.length},(w,_)=>i[h[_]])),y=Dn(e,m,t[1],t[2],n,o,s,r.epsilon),$=w=>{let _=R(t[0].dataType),T=u===1?"vec2f":`mat${u}x2f`,x=B=>{let L=B===0?"x":"y",q=u===1?"f32":`vec${u}f`;switch(u){case 1:return`${_}(${q}(scale.${L}))`;case 2:return`vec2<${_}>(${q}(scale[0].${L}, scale[1].${L}))`;case 4:return`vec4<${_}>(${q}(scale[0].${L}, scale[1].${L}, scale[2].${L}, scale[3].${L}))`;default:throw new Error(`Not supported compoents ${u}`)}},z=A("input",t[0].dataType,t[0].dims,u),D=X("output",t[0].dataType,a,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${z.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${T}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${D.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${w.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${x(0)}, ${x(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:$},{inputs:[t[0],y]})},Yl=(e,t)=>{t.format==="NHWC"?Xl(e,e.inputs,t):Ql(e,e.inputs,t)}}),Jl,ed,td,Jc=E(()=>{$e(),fe(),de(),Jl=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},ed=(e,t,r)=>{let i=t.simplified,a=e[0].dims,n=e[1],s=!i&&e[2],o=a,u=U.normalizeAxis(t.axis,a.length),l=U.sizeToDimension(a,u),d=U.sizeFromDimension(a,u),p=U.size(n.dims),f=s?U.size(s.dims):0;if(p!==d||s&&f!==d)throw new Error(`Size of X.shape()[axis:] == ${d}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${p} and bias size of ${f}`);let h=[];for(let z=0;z<a.length;++z)z<u?h.push(a[z]):h.push(1);let m=M(d),y=["type","type"],$=[{type:12,data:l},{type:1,data:d},{type:12,data:Math.floor(d/m)},{type:1,data:t.epsilon}];s&&y.push("type");let w=r>1,_=r>2,T=z=>{let D=R(e[0].dataType),B=[A("x",e[0].dataType,e[0].dims,m),A("scale",n.dataType,n.dims,m)];s&&B.push(A("bias",s.dataType,s.dims,m)),B.push(X("output",e[0].dataType,o,m)),w&&B.push(X("mean_data_output",1,h)),_&&B.push(X("inv_std_output",1,h));let L=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${z.registerUniforms(L).declareVariables(...B)}
  ${z.mainStart()}
    ${z.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${F("f32",m)};
    var mean_square_vector = ${F("f32",m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${j(D,m,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${K("mean_vector",m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${K("mean_square_vector",m)} / uniforms.norm_size ${i?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${j(D,m,"x[j + offset]")};
      let f32scale = ${j(D,m,"scale[j]")};
      output[j + offset] = ${B[0].type.value}((f32input ${i?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${j(D,m,"bias[j]")}`:""}
      );
    }

    ${w?"mean_data_output[global_idx] = mean":""};
    ${_?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},x=[{dims:o,dataType:e[0].dataType}];return w&&x.push({dims:h,dataType:1}),_&&x.push({dims:h,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${m};${r};${i}`,inputDependencies:y},getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:$}),getShaderSource:T}},td=(e,t)=>{Jl(e.inputs),e.compute(ed(e.inputs,t,e.outputCount))}}),rd,id,ef=E(()=>{fe(),_n(),vn(),rd=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},id=e=>{rd(e.inputs);let t=er.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],i=e.inputs[0].dims[e.inputs[0].dims.length-1];if(r<8&&i<8)e.compute(yn(e.inputs,{activation:""},t));else{let a=t[t.length-2],n=U.size(e.inputs[0].dims.slice(0,-2)),s=U.size(e.inputs[1].dims.slice(0,-2));if(n!==1&&a===1&&s===1){let o=e.inputs[0].reshape([1,n,i]),u=e.inputs[1].reshape([1,i,r]),l=[1,n,r],d=[o,u];e.compute(Ba(d,{activation:""},t,l),{inputs:d})}else e.compute(Ba(e.inputs,{activation:""},t))}}}),ad,nd,sd,od,ud,tf=E(()=>{$e(),fe(),b(),de(),ad=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],i=r.dims.length;if(r.dims[i-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),n=t.blockSize/8*t.bits,s=e[1];if(!U.areEqual(s.dims,[t.n,a,n]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let o=e[2].dims;if(U.size(o)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let u=e[3].dims,l=t.bits>4?t.n*a:t.n*Math.floor((a+1)/2);if(U.size(u)!==l)throw new Error("zeroPoints input size error.")}},nd=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=U.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=M(t.k),f=M(l),h=M(s),m=o.concat([a,s]),y=a>1&&s/h%2===0?2:1,$=U.size(m)/h/y,w=64,_=[],T=[u,a,n/p],x=U.convertShape(e[1].dims).slice();x.splice(-1,1,l/f),_.push(...k(T)),_.push(...k(x)),_.push(...k(e[2].dims)),e.length===4&&_.push(...k(U.convertShape(e[3].dims)));let z=[u,a,s/h];_.push(...k(z));let D=B=>{let L=T.length,q=A("a",e[0].dataType,L,p),ee=A("b",12,x.length,f),we=A("scales",e[2].dataType,e[2].dims.length),ue=[q,ee,we],ge=e.length===4?A("zero_points",12,e[3].dims.length):void 0;ge&&ue.push(ge);let qe=z.length,ke=X("output",e[0].dataType,qe,h),he=R(e[0].dataType),ze=(()=>{switch(p){case 1:return`array<${he}, 8>`;case 2:return`mat4x2<${he}>`;case 4:return`mat2x4<${he}>`;default:throw new Error(`${p}-component is not supported.`)}})(),pe=()=>{let G=`
          // reuse a data
            var input_offset = ${q.indicesToOffset(`${q.type.indices}(batch, row, word_offset)`)};
            var a_data: ${ze};
            for (var j: u32 = 0; j < ${8/p}; j++) {
              a_data[j] = ${q.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let te=0;te<h*y;te++)G+=`
            b_value = ${f===1?`b${te}_data`:`b${te}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${ze}(${Array.from({length:4},(me,Oe)=>`${he}(b_value_lower[${Oe}]), ${he}(b_value_upper[${Oe}])`).join(", ")});
            b_dequantized_values = ${p===1?`${ze}(${Array.from({length:8},(me,Oe)=>`(b_quantized_values[${Oe}] - ${ge?`zero_point${te}`:"zero_point"}) * scale${te}`).join(", ")});`:`(b_quantized_values - ${ze}(${Array(8).fill(`${ge?`zero_point${te}`:"zero_point"}`).join(",")})) * scale${te};`};
            workgroup_shared[local_id.x * ${y} + ${Math.floor(te/h)}]${h>1?`[${te%h}]`:""} += ${Array.from({length:8/p},(me,Oe)=>`${p===1?`a_data[${Oe}] * b_dequantized_values[${Oe}]`:`dot(a_data[${Oe}], b_dequantized_values[${Oe}])`}`).join(" + ")};
          `;return G},Se=()=>{let G=`
            var col_index = col * ${h};
            ${ge?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${he}(8);`}
            `;for(let te=0;te<h*y;te++)G+=`
            let scale${te} = ${we.getByOffset("col_index * nBlocksPerCol + block")};
            ${ge?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${ge.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${te} = ${he}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return G},wt=()=>{let G=`col_index = col * ${h};`;for(let te=0;te<h*y;te++)G+=`
            let b${te}_data = ${ee.getByIndices(`${ee.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return G+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${ze};
            var b_dequantized_values: ${ze};`,G};return`
        var<workgroup> workgroup_shared: array<${ke.type.value}, ${y*w}>;
        ${B.declareVariables(...ue,ke)}
        ${B.mainStart([w,1,1])}
          let output_indices = ${ke.offsetToIndices(`(global_idx / ${w}) * ${y}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${w}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/p};
            ${Se()}
            for (var word: u32 = 0; word < ${l}; word += ${f}) {
              ${wt()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${pe()}
                word_offset += ${8/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${y}) {
            var output_value: ${ke.type.value} = ${ke.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${w}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${y};
            }
            ${ke.setByIndices(`${ke.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${p};${f};${h};${y};${w}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:m,dataType:d}],dispatchGroup:{x:$},programUniforms:_}),getShaderSource:D}},sd=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],n=t.k,s=t.n,o=r.slice(0,i-2),u=U.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=M(t.k),f=M(l),h=o.concat([a,s]),m=128,y=s%8===0?8:s%4===0?4:1,$=m/y,w=$*f*8,_=w/p,T=w/t.blockSize,x=U.size(h)/y,z=[],D=[u,a,n/p],B=U.convertShape(e[1].dims).slice();B.splice(-1,1,l/f),z.push(...k(D)),z.push(...k(B)),z.push(...k(e[2].dims)),e.length===4&&z.push(...k(U.convertShape(e[3].dims)));let L=[u,a,s];z.push(...k(L));let q=ee=>{let we=D.length,ue=A("a",e[0].dataType,we,p),ge=A("b",12,B.length,f),qe=A("scales",e[2].dataType,e[2].dims.length),ke=[ue,ge,qe],he=e.length===4?A("zero_points",12,e[3].dims.length):void 0;he&&ke.push(he);let ze=L.length,pe=X("output",e[0].dataType,ze),Se=R(e[0].dataType),wt=()=>{switch(p){case 1:return`
          let a_data0 = vec4<${Se}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Se}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Se}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Se}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${p}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${ue.type.value}, ${_}>;
        var<workgroup> inter_results: array<array<${pe.type.value}, ${$}>, ${y}>;
        ${ee.declareVariables(...ke,pe)}
        ${ee.mainStart([$,y,1])}
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
                sub_a[a_offset] = ${ue.getByIndices(`${ue.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${ue.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${T} + local_id.x;
            ${he?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${he.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Se}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${Se}(8);`}
            let scale = ${qe.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${ge.getByIndices(`${ge.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/p};
            for (var i: u32 = 0; i < ${f}; i++) {
              ${wt()}
              let b_value = ${f===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${Se}>(${Array.from({length:4},(G,te)=>`${Se}(b_value_lower[${te}]), ${Se}(b_value_upper[${te}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${Se}>(${Array(8).fill("zero_point").join(",")})) * scale;
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
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${p};${f};${$};${y}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:h,dataType:d}],dispatchGroup:{x},programUniforms:z}),getShaderSource:q}},od=(e,t)=>{ad(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(sd(e.inputs,t)):e.compute(nd(e.inputs,t))},ud=e=>g(e)}),ld,dd,pd,cd,fd,hd,md,gd,yd,rf=E(()=>{$e(),fe(),de(),ld=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},dd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
            k = i32(${e.indicesGet("indices",a)}) - ${P("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${P("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${P("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${i}
            value = x[offset];
          }
      `},pd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${P("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${P("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${P("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${P("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},cd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${P("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${P("uniforms.x_shape",a,t)})) {
                  k = i32(${P("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${P("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},fd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${P("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${P("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${P("uniforms.x_shape",a,t)})) {
                  k -= i32(${P("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${P("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},hd=(e,t,r)=>{switch(r.mode){case 0:return dd(e,t,r.pads.length);case 1:return pd(e,t,r.pads.length);case 2:return cd(e,t,r.pads.length);case 3:return fd(e,t,r.pads.length);default:throw new Error("Invalid mode")}},md=(e,t)=>{let r=U.padShape(e[0].dims.slice(),t.pads),i=e[0].dims,a=U.size(r),n=[{type:12,data:a},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&n.push({type:s?e[2].dataType:1,data:t.value}),n.push(...k(e[0].dims,r));let o=["rank"],u=l=>{let d=X("output",e[0].dataType,r.length),p=A("x",e[0].dataType,i.length),f=p.type.value,h=hd(d,i.length,t),m=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&m.push({name:"constant_value",type:s?f:"f32"}),`
            ${l.registerUniforms(m).declareVariables(p,d)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${d.offsetToIndices("global_idx")};

            var value = ${f}(0);
            ${h}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:o},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(U.size(r)/64)},programUniforms:n}),getShaderSource:u}},gd=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),i=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,n=new Int32Array(2*a).fill(0);if(e.length>=4){let o=e[3].getBigInt64Array();for(let u=0;u<o.length;u++)n[Number(o[u])]=Number(r[u]),n[Number(o[u])+a]=Number(r[u+o.length])}else r.forEach((o,u)=>n[Number(u)]=Number(o));let s=[];return n.forEach(o=>s.push(o)),{mode:t.mode,value:i,pads:s}}else return t},yd=(e,t)=>{ld(e.inputs);let r=gd(e.inputs,t);e.compute(md(e.inputs,r),{inputs:[0]})}}),ga,Pn,Un,Nn,Ln,_d,wd,Vn,qn,bd,$d,Fn,vd,xd,Wn,Sd,Td,Ed,Id,af=E(()=>{ht(),$e(),fe(),de(),ga=e=>{if(Q.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Pn=(e,t,r)=>{let i=t.format==="NHWC",a=e.dims.slice();i&&a.splice(1,0,a.pop());let n=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),o=t.strides.slice(),u=n?t.dilations.slice():[],l=t.pads.slice();hr.adjustPoolAttributes(r,a,s,o,u,l);let d=hr.computePoolOutputShape(r,a,o,u,s,l,t.autoPad),p=Object.assign({},t);n?Object.assign(p,{kernelShape:s,strides:o,pads:l,dilations:u,cacheKey:t.cacheKey}):Object.assign(p,{kernelShape:s,strides:o,pads:l,cacheKey:t.cacheKey});let f=d.slice();return f.push(f.splice(1,1)[0]),[p,i?f:d]},Un=(e,t)=>{let r=t.format==="NHWC",i=U.size(e),a=U.size(t.kernelShape),n=[{type:12,data:i},{type:12,data:a}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let o=t.kernelShape[t.kernelShape.length-1],u=t.strides[t.strides.length-1],l=t.pads[t.pads.length/2-1],d=t.pads[t.pads.length-1],p=!!(l+d);n.push({type:12,data:o},{type:12,data:u},{type:12,data:l},{type:12,data:d}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let f=!1;if(t.kernelShape.length===2){let h=t.kernelShape[t.kernelShape.length-2],m=t.strides[t.strides.length-2],y=t.pads[t.pads.length/2-2],$=t.pads[t.pads.length-2];f=!!(y+$),n.push({type:12,data:h},{type:12,data:m},{type:12,data:y},{type:12,data:$}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[n,s,!0,p,f]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let o=U.computeStrides(t.kernelShape);n.push({type:12,data:o},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:o.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let u=t.pads.reduce((l,d)=>l+d);return[n,s,!!u,!1,!1]}},Nn=(e,t,r,i,a,n,s,o,u,l,d,p)=>{let f=a.format==="NHWC",h=t.type.value,m=X("output",t.type.tensor,i);if(a.kernelShape.length<=2){let y="",$="",w="",_=r-(f?2:1);if(d?y=`
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
                  offsets[j] = offset / ${P("uniforms.kernelStrides","j",y)};
                  offset -= offsets[j] * ${P("uniforms.kernelStrides","j",y)};
                }
                offsets[${y-1}] = offset;

                isPad = false;
                for (var j = ${r-y}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${P("uniforms.strides",`j - ${r-y}u`,y)}
                    + offsets[j - ${r-y}u] - ${P("uniforms.pads","j - 2u",$)};
                  ${w}
              }
              ${s}

              output[global_idx] = value;
            }`}},Ln=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,_d=e=>`${Ln(e)};${e.countIncludePad}`,wd=e=>`${Ln(e)};${e.storageOrder};${e.dilations}`,Vn=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),qn=(e,t,r,i)=>{let[a,n]=Pn(t,i,r),s=A("x",t.dataType,t.dims.length),o=s.type.value,u="value += x_val;",l="";a.countIncludePad?l+=`value /= ${o}(uniforms.kernelSize);`:l+=`value /= ${o}(i32(uniforms.kernelSize) - pad);`;let[d,p,f,h,m]=Un(n,a);d.push(...k(t.dims,n));let y=["rank"];return{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(U.size(n)/64)},programUniforms:d}),getShaderSource:$=>Nn($,s,t.dims.length,n.length,a,u,l,0,p,f,h,m)}},bd=e=>{let t=e.count_include_pad!==0,r=Vn(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let i={countIncludePad:t,...r,cacheKey:""};return{...i,cacheKey:_d(i)}},$d=(e,t)=>{ga(e.inputs),e.compute(qn("AveragePool",e.inputs[0],!1,t))},Fn={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},vd=e=>{let t=e.format;return{format:t,...Fn,cacheKey:t}},xd=(e,t)=>{ga(e.inputs),e.compute(qn("GlobalAveragePool",e.inputs[0],!0,t))},Wn=(e,t,r,i)=>{let[a,n]=Pn(t,i,r),s=`
      value = max(x_val, value);
    `,o="",u=A("x",t.dataType,t.dims.length),l=["rank"],[d,p,f,h,m]=Un(n,a);return d.push(...k(t.dims,n)),{name:e,shaderCache:{hint:`${i.cacheKey};${f};${h};${m}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:n,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(U.size(n)/64)},programUniforms:d}),getShaderSource:y=>Nn(y,u,t.dims.length,n.length,a,s,o,t.dataType===10?-65504:-1e5,p,f,h,m)}},Sd=(e,t)=>{ga(e.inputs),e.compute(Wn("MaxPool",e.inputs[0],!1,t))},Td=e=>{let t=e.storage_order,r=e.dilations,i=Vn(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...i,cacheKey:""};return{...a,cacheKey:wd(a)}},Ed=e=>{let t=e.format;return{format:t,...Fn,cacheKey:t}},Id=(e,t)=>{ga(e.inputs),e.compute(Wn("GlobalMaxPool",e.inputs[0],!0,t))}}),kd,Cd,zd,Ad,nf=E(()=>{$e(),fe(),b(),de(),kd=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,i)=>r===e[2].dims[i]).reduce((r,i)=>r&&i,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,n)=>n===t.axis||a===e[0].dims[n]).reduce((a,n)=>a&&n,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],i=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/i)||t.blockSize>Math.ceil(r/(i-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Cd=(e,t)=>{let r=U.normalizeAxis(t.axis,e[0].dims.length),i=e[0].dataType,a=i===3,n=e[0].dims,s=e[1].dataType,o=U.size(n),u=i===3||i===2,l=u?[Math.ceil(U.size(e[0].dims)/4)]:e[0].dims,d=e[1].dims,p=e.length>2?e[2]:void 0,f=p?u?[Math.ceil(U.size(p.dims)/4)]:p.dims:void 0,h=d.length===0||d.length===1&&d[0]===1,m=h===!1&&d.length===1,y=M(o),$=h&&(!u||y===4),w=$?y:1,_=$&&!u?y:1,T=A("input",u?12:i,l.length,_),x=A("scale",s,d.length),z=p?A("zero_point",u?12:i,f.length):void 0,D=X("output",s,n.length,w),B=[T,x];z&&B.push(z);let L=[l,d];p&&L.push(f);let q=[{type:12,data:o/w},{type:12,data:r},{type:12,data:t.blockSize},...k(...L,n)],ee=we=>{let ue=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${we.registerUniforms(ue).declareVariables(...B,D)}
      ${we.mainStart()}
          ${we.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${D.offsetToIndices("global_idx")};

          // Set input x
          ${u?`
            let input = ${T.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${w===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${T.getByOffset("global_idx")};`};

          // Set scale input
          ${h?`let scale_value= ${x.getByOffset("0")}`:m?`
            let scale_index = ${D.indicesGet("output_indices","uniforms.axis")};
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
                let zero_point_index = ${D.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${z.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${D.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${z.getByOffset("zero_point_index")};`:u?`
                let zero_point_offset = ${x.indicesToOffset("scale_indices")};
                let zero_point_input = ${z.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${z.getByIndices("scale_indices")};`:`let zero_point_value = ${u?a?"i32":"u32":T.type.value}(0);`};
      // Compute and write output
      ${D.setByOffset("global_idx",`${D.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:z?["rank","rank","rank"]:["rank","rank"]},getShaderSource:ee,getRunData:()=>({outputs:[{dims:n,dataType:s}],dispatchGroup:{x:Math.ceil(o/w/64),y:1,z:1},programUniforms:q})}},zd=(e,t)=>{kd(e.inputs,t),e.compute(Cd(e.inputs,t))},Ad=e=>g({axis:e.axis,blockSize:e.blockSize})}),Od,Rd,Md,sf=E(()=>{ht(),$e(),de(),Od=(e,t,r)=>{let i=e===t,a=e<t&&r<0,n=e>t&&r>0;if(i||a||n)throw new Error("Range these inputs' contents are invalid.")},Rd=(e,t,r,i)=>{let a=Math.abs(Math.ceil((t-e)/r)),n=[a],s=a,o=[{type:12,data:s},{type:i,data:e},{type:i,data:r},...k(n)],u=l=>{let d=X("output",i,n.length),p=d.type.value,f=[{name:"outputSize",type:"u32"},{name:"start",type:p},{name:"delta",type:p}];return`
        ${l.registerUniforms(f).declareVariables(d)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${p}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${i}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:n,dataType:i}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:o})}},Md=e=>{let t=0,r=0,i=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],i=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],i=e.inputs[2].getFloat32Array()[0]),Q.webgpu.validateInputContent&&Od(t,r,i),e.compute(Rd(t,r,i,e.inputs[0].dataType),{inputs:[]})}}),Bd,Gn,jn,Dd,Pd,Ud,of=E(()=>{$e(),fe(),b(),de(),Bd=(e,t,r,i)=>{if(e!=="none"&&i!=="i32"&&i!=="u32"&&i!=="f32")throw new Error(`Input ${i} is not supported with reduction ${e}.`);let a=`{
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
      }`,Dd=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r,n=1,s=Math.ceil(U.size(i)/n),o=i[i.length-1],u=U.sizeFromDimension(r,o),l=U.sizeFromDimension(i,0)/o,d=[{type:12,data:s},{type:12,data:o},{type:12,data:u},...k(e[1].dims,e[2].dims,a)],p=f=>{let h=A("indices",e[1].dataType,e[1].dims.length),m=A("updates",e[2].dataType,e[2].dims.length,n),y=t.reduction!=="none"&&t.reduction!==""?Je("output",e[0].dataType,a.length):X("output",e[0].dataType,a.length,n);return`
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
  }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}),getShaderSource:p}},Pd=e=>g({reduction:e.reduction}),Ud=(e,t)=>{e.compute(Dd(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Nd,Ld,Vd,Hn,qd,Fd,Wd,Gd,jd,Hd,Kd,Zd,Kn,Qd,Xd,Yd,Jd,ep,tp,rp,uf=E(()=>{$e(),fe(),b(),de(),Nd=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Ld=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let i=new Array(r).fill(1);return t.forEach((a,n)=>i[a]=e[n]),i},Vd=(e,t,r,i,a,n)=>{let[s,o,u]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(d=>n.push(d));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(o>0&&e.length>o&&e[o].dims.length===1&&e[o].dims[0]>0){if(e[o].getFloat32Array().forEach(d=>i.push(d)),i.length!==0&&i.length!==l&&r>=18&&i.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Nd(i,t),t.axes.length>0&&Ld(i,t.axes,l).forEach((d,p)=>i[p]=d)}if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0&&(e[u].getBigInt64Array().forEach(d=>a.push(Number(d))),a.length!==0&&a.length!==l&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(i.length!==0&&i.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof i<"u"&&typeof a<"u"&&i.length>0&&a.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},Hn=(e,t,r,i)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${i}(big / (${r}));
  let fract = ${i}(big % (${r})) / ${i}(${r});
  return whole + fract;
`,qd=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
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
        var scale = ${P("uniforms.scales","i",i)};
        var roi_low = ${P("uniforms.roi","i",a)};
        var roi_hi = ${P("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${P("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${P("uniforms.output_shape","i",r.length)};
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
        var scale = ${P("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${P("uniforms.roi","i",n)};
          var roi_hi = ${P("uniforms.roi",`i + ${r.length}`,n)};
          var input_shape_i = ${P("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${P("uniforms.output_shape","i",i.length)};
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
        if (input_index < 0 || input_index >= ${P("uniforms.input_shape","i",t.length)}) {
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
    }`},Jd=(e,t,r,i,a,n)=>{let s=e.dims,o=Wd(n,t.axes,s.length),u=Gd(s,i,a,t.axes),l=i.slice();i.length===0&&(l=s.map((_,T)=>_===0?1:u[T]/_),t.keepAspectRatioPolicy!=="stretch"&&(u=jd(s,l,t)));let d=X("output",e.dataType,u.length),p=A("input",e.dataType,s.length),f=U.size(u),h=s.length===u.length&&s.every((_,T)=>_===u[T]),m=t.coordinateTransformMode==="tf_crop_and_resize",y=t.extrapolationValue,$=p.type.value,w=_=>`
      ${h?"":`
      ${qd(t.coordinateTransformMode,$)};
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
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${l.length>0?t.mode==="cubic"?l:l.length:""}|${a.length>0?a:""}|${o.length>0?o:""}|${h}|${t.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:u,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},{type:1,data:l},{type:1,data:o},...k(s,u)]})}},ep=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},tp=(e,t)=>{let r=[],i=[],a=[],n=ep(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");Vd(e.inputs,t,n,r,i,a),e.compute(Jd(e.inputs[0],t,n,r,i,a),{inputs:[0]})},rp=e=>{let t=e.antialias,r=e.axes,i=e.coordinateTransformMode,a=e.cubicCoeffA,n=e.excludeOutside!==0,s=e.extrapolationValue,o=e.keepAspectRatioPolicy,u=e.mode,l=e.nearestMode===""?"simple":e.nearestMode;return g({antialias:t,axes:r,coordinateTransformMode:i,cubicCoeffA:a,excludeOutside:n,extrapolationValue:s,keepAspectRatioPolicy:o,mode:u,nearestMode:l})}}),ip,ap,np,lf=E(()=>{$e(),fe(),de(),ip=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],i=e[2];if(t.dataType!==r.dataType||t.dataType!==i.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],n=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==n)throw new Error("Skip must have the same sequence length as input");if(i.dims.length!==1)throw new Error("Gamma must be 1D");if(i.dims[i.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},ap=(e,t,r,i)=>{let a=t.simplified,n=e[0].dims,s=U.size(n),o=n,u=s,l=n.slice(-1)[0],d=i?n.slice(0,-1).concat(1):[],p=!a&&e.length>3,f=e.length>4,h=i&&r>1,m=i&&r>2,y=r>3,$=64,w=M(l),_=[{type:12,data:u},{type:12,data:w},{type:12,data:l},{type:1,data:t.epsilon}],T=z=>{let D=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],B=[A("x",e[0].dataType,e[0].dims,w),A("skip",e[1].dataType,e[1].dims,w),A("gamma",e[2].dataType,e[2].dims,w)];p&&B.push(A("beta",e[3].dataType,e[3].dims,w)),f&&B.push(A("bias",e[4].dataType,e[4].dims,w)),B.push(X("output",e[0].dataType,o,w)),h&&B.push(X("mean_output",1,d)),m&&B.push(X("inv_std_output",1,d)),y&&B.push(X("input_skip_bias_sum",e[0].dataType,o,w));let L=R(e[0].dataType),q=R(1,w);return`

      ${z.registerUniforms(D).declareVariables(...B)}
      var<workgroup> sum_shared : array<${q}, ${$}>;
      var<workgroup> sum_squared_shared : array<${q}, ${$}>;

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
      }`},x=[{dims:o,dataType:e[0].dataType}];return r>1&&x.push({dims:d,dataType:1}),r>2&&x.push({dims:d,dataType:1}),r>3&&x.push({dims:n,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${w};${h};${m};${y}`,inputDependencies:e.map((z,D)=>"type")},getShaderSource:T,getRunData:()=>({outputs:x,dispatchGroup:{x:Math.ceil(u/l)},programUniforms:_})}},np=(e,t)=>{ip(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(ap(e.inputs,t,e.outputCount,!1),{outputs:r})}}),sp,ya,op,Zn,up,lp,dp,pp,df=E(()=>{$e(),fe(),b(),de(),sp=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,i)=>{if(e[i+1].dataType!==6&&e[i+1].dataType!==7)throw new Error(`Input ${i} must be an array of int32 or int64`)})},ya=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(i=>r.push(Number(i)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(i=>r.push(Number(i)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},op=(e,t)=>{if(e.length>1){let r=ya(e,1),i=ya(e,2),a=ya(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),g({starts:r,ends:i,axes:a})}else return t},Zn=(e,t,r,i,a)=>{let n=e;return e<0&&(n+=r[i[t]]),a[t]<0?Math.max(0,Math.min(n,r[i[t]]-1)):Math.max(0,Math.min(n,r[i[t]]))},up=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length}; i >= 0; i--) {
            let input_shape_i = ${P("uniforms.input_shape","i",r.length)};
            let steps_i = ${P("uniforms.steps","i",r.length)};
            let signs_i = ${P("uniforms.signs","i",r.length)};
            let starts_i = ${P("uniforms.starts","i",r.length)};
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
      }`,lp=(e,t)=>{let r=e[0].dims,i=U.size(r),a=t.axes.length>0?U.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],n=ya(e,4);n.forEach(w=>w!==0||(()=>{throw new Error("step cannot be 0")})),n.length===0&&(n=Array(a.length).fill(1));let s=t.starts.map((w,_)=>Zn(w,_,r,a,n)),o=t.ends.map((w,_)=>Zn(w,_,r,a,n));if(a.length!==s.length||a.length!==o.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let w=0;w<r.length;++w)a.includes(w)||(s.splice(w,0,0),o.splice(w,0,r[w]),n.splice(w,0,1));let u=n.map(w=>Math.sign(w));n.forEach((w,_,T)=>{if(w<0){let x=(o[_]-s[_])/w,z=s[_],D=z+x*n[_];s[_]=D,o[_]=z,T[_]=-w}});let l=r.slice(0);a.forEach((w,_)=>{l[w]=Math.ceil((o[w]-s[w])/n[w])});let d={dims:l,dataType:e[0].dataType},p=X("output",e[0].dataType,l.length),f=A("input",e[0].dataType,e[0].dims.length),h=U.size(l),m=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:n.length}],y=[{type:12,data:h},{type:12,data:s},{type:6,data:u},{type:12,data:n},...k(e[0].dims,l)],$=w=>`
      ${w.registerUniforms(m).declareVariables(f,p)}
        ${up(f,p,r)}
        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${p.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${p.setByOffset("global_idx",f.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${s.length}_${n.length}`,inputDependencies:["rank"]},getShaderSource:$,getRunData:()=>({outputs:[d],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:y})}},dp=(e,t)=>{sp(e.inputs,t);let r=op(e.inputs,t);e.compute(lp(e.inputs,r),{inputs:[0]})},pp=e=>{let t=e.starts,r=e.ends,i=e.axes;return g({starts:t,ends:r,axes:i})}}),cp,fp,hp,mp,pf=E(()=>{$e(),fe(),b(),gt(),de(),cp=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},fp=(e,t)=>{let r=e.inputs[0],i=r.dims,a=U.size(i),n=i.length,s=U.normalizeAxis(t.axis,n),o=s<i.length-1,u,l=[];o?(l=Array.from({length:n},(B,L)=>L),l[s]=n-1,l[n-1]=s,u=e.compute(bt(r,l),{inputs:[r],outputs:[-1]})[0]):u=r;let d=u.dims,p=d[n-1],f=a/p,h=M(p),m=p/h,y=64;f===1&&(y=256);let $=(B,L)=>L===4?`max(max(${B}.x, ${B}.y), max(${B}.z, ${B}.w))`:L===2?`max(${B}.x, ${B}.y)`:L===3?`max(max(${B}.x, ${B}.y), ${B}.z)`:B,w=A("x",u.dataType,u.dims,h),_=X("result",u.dataType,u.dims,h),T=w.type.value,x=R(u.dataType)==="f32"?`var threadMax = ${T}(-3.402823e+38f);`:`var threadMax = ${T}(-65504.0h);`,z=B=>`
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
      }`,D=e.compute({name:"Softmax",shaderCache:{hint:`${h};${y}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:d,dataType:u.dataType}],dispatchGroup:{x:f},programUniforms:[{type:6,data:m}]}),getShaderSource:z},{inputs:[u],outputs:[o?-1:0]})[0];o&&e.compute(bt(D,l),{inputs:[D]})},hp=(e,t)=>{cp(e.inputs),fp(e,t)},mp=e=>g({axis:e.axis})}),Qn,gp,yp,_p,wp,cf=E(()=>{$e(),fe(),de(),Qn=e=>Array.from(e.getBigInt64Array(),Number),gp=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(Qn(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},yp=(e,t)=>{let r=[];for(let i=0;i<e.length;++i)r.push(e[i]*t[i]);return r},_p=(e,t)=>{let r=e[0].dims,i=t??Qn(e[1]),a=yp(r,i),n=U.size(a),s=e[0].dataType,o=A("input",s,r.length),u=X("output",s,a.length),l=d=>`
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
    }`;return{name:"Tile",shaderCache:{hint:`${i}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:[{type:12,data:n},...k(e[0].dims,a)]}),getShaderSource:l}},wp=e=>{gp(e.inputs),e.compute(_p(e.inputs),{inputs:[0]})}}),bp,$p,vp,ff=E(()=>{$e(),fe(),de(),bp=(e,t,r,i,a)=>{let n=X("output_data",a,r.length,4),s=A("a_data",t[1].dataType,t[1].dims.length,4),o=A("b_data",t[2].dataType,t[2].dims.length,4),u=A("c_data",t[0].dataType,t[0].dims.length,4),l,d=(p,f,h)=>`select(${f}, ${p}, ${h})`;if(!i)l=n.setByOffset("global_idx",d(s.getByOffset("global_idx"),o.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let p=(f,h,m="")=>{let y=`a_data[index_a${h}][component_a${h}]`,$=`b_data[index_b${h}][component_b${h}]`,w=`bool(c_data[index_c${h}] & (0xffu << (component_c${h} * 8)))`;return`
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
      }`},$p=e=>{let t=e[1].dims,r=e[2].dims,i=e[0].dims,a=e[1].dataType,n=!(U.areEqual(t,r)&&U.areEqual(r,i)),s=t,o=U.size(t);if(n){let l=er.calcShape(er.calcShape(t,r,!1),i,!1);if(!l)throw new Error("Can't perform where op on the given tensors");s=l,o=U.size(s)}let u=Math.ceil(o/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>bp(l,e,s,n,a),getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(o/64/4)},programUniforms:[{type:12,data:u},...k(i,t,r,s)]})}},vp=e=>{e.compute($p(e.inputs))}}),xp,hf=E(()=>{Ic(),dn(),kc(),Cc(),zc(),Ac(),Oc(),Pc(),Nc(),Lc(),Vc(),qc(),Fc(),Wc(),Gc(),jc(),Hc(),Kc(),Zc(),Qc(),Xc(),Yc(),Jc(),ef(),tf(),Bl(),rf(),af(),nf(),sf(),of(),on(),uf(),Gl(),lf(),df(),pf(),ql(),cf(),gt(),hn(),ff(),xp=new Map([["Abs",[ro]],["Acos",[io]],["Acosh",[ao]],["Add",[jo]],["ArgMax",[Vs,ln]],["ArgMin",[Ls,ln]],["Asin",[no]],["Asinh",[so]],["Atan",[oo]],["Atanh",[uo]],["Attention",[Hs]],["AveragePool",[$d,bd]],["BatchNormalization",[Xs]],["BiasAdd",[eo]],["BiasSplitGelu",[Fo]],["Cast",[po,lo]],["Ceil",[ho]],["Clip",[fo]],["Concat",[su,ou]],["Conv",[In,Tn]],["ConvTranspose",[Mu,Au]],["Cos",[mo]],["Cosh",[go]],["CumSum",[Du,Pu]],["DepthToSpace",[Vu,qu]],["DequantizeLinear",[zd,Ad]],["Div",[Ho]],["Einsum",[Ku,Zu]],["Elu",[yo,pa]],["Equal",[Ko]],["Erf",[_o]],["Exp",[wo]],["Expand",[Ju]],["FastGelu",[tl]],["Floor",[bo]],["FusedConv",[In,Tn]],["Gather",[nl,al]],["GatherElements",[gl,ml]],["GatherBlockQuantized",[pl,cl]],["GatherND",[ol,ul]],["Gelu",[$o]],["Gemm",[bl,wl]],["GlobalAveragePool",[xd,vd]],["GlobalMaxPool",[Id,Ed]],["Greater",[Yo]],["GreaterOrEqual",[eu]],["GridSample",[Cl,zl]],["GroupQueryAttention",[Zl]],["HardSigmoid",[Co,ko]],["InstanceNormalization",[Yl]],["LayerNormalization",[td]],["LeakyRelu",[vo,pa]],["Less",[Jo]],["LessOrEqual",[tu]],["Log",[Po]],["MatMul",[id]],["MatMulNBits",[od,ud]],["MaxPool",[Sd,Td]],["Mul",[Zo]],["MultiHeadAttention",[Ml,Ol]],["Neg",[So]],["Not",[xo]],["Pad",[yd]],["Pow",[Qo]],["QuickGelu",[Lo,pa]],["Range",[Md]],["Reciprocal",[To]],["ReduceMin",[Bs]],["ReduceMean",[zs]],["ReduceMax",[Ms]],["ReduceSum",[Ps]],["ReduceProd",[Ds]],["ReduceL1",[As]],["ReduceL2",[Os]],["ReduceLogSum",[Ns]],["ReduceLogSumExp",[Rs]],["ReduceSumSquare",[Us]],["Relu",[Eo]],["Resize",[tp,rp]],["RotaryEmbedding",[Wl]],["ScatterND",[Ud,Pd]],["Sigmoid",[Io]],["Sin",[zo]],["Sinh",[Ao]],["Slice",[dp,pp]],["SkipLayerNormalization",[np]],["Split",[Ll,Vl]],["Sqrt",[Oo]],["Softmax",[hp,mp]],["Sub",[Xo]],["Tan",[Ro]],["Tanh",[Mo]],["ThresholdedRelu",[Do,pa]],["Tile",[wp]],["Transpose",[ua,Dt]],["Where",[vp]]])}),Sp,mf=E(()=>{ht(),Bt(),de(),Sp=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,i,a){pt(e.programInfo.name);let n=this.backend.device,s=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let o=[];for(let l of t)o.push({binding:o.length,resource:{buffer:l.buffer}});for(let l of r)o.push({binding:o.length,resource:{buffer:l.buffer}});a&&o.push({binding:o.length,resource:a});let u=n.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:o,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let l={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:u,dispatchGroup:i};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(l)}s.setPipeline(e.computePipeline),s.setBindGroup(0,u),s.dispatchWorkgroups(...i),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),ut(e.programInfo.name)}dispose(){}build(e,t){pt(e.name);let r=this.backend.device,i=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(l=>{r.features.has(l.feature)&&i.push(`enable ${l.extension};`)});let a=Ze(t,this.backend.device.limits),n=e.getShaderSource(a),s=`${i.join(`
`)}
${a.additionalImplementations}
${n}`,o=r.createShaderModule({code:s,label:e.name});Re("verbose",()=>`[WebGPU] ${e.name} shader code: ${s}`);let u=r.createComputePipeline({compute:{module:o,entryPoint:"main"},layout:"auto",label:e.name});return ut(e.name),{programInfo:e,computePipeline:u,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,i=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&i<=a)return[t,r,i];let n=t*r*i,s=Math.ceil(Math.sqrt(n));if(s>a){if(s=Math.ceil(Math.cbrt(n)),s>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[s,s,s]}else return[s,s,1]}}}),Tp={};se(Tp,{WebGpuBackend:()=>Cp});var Ep,Ip,kp,Cp,gf=E(()=>{ht(),$e(),Bt(),mr(),nn(),hf(),mf(),Ep=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let i=0;i<e.length;++i){let a=e[i].dataType;switch(t[i]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let n=e[i].dims.length;r.push(`${a};${n}`);break}case"dims":{let n=e[i].dims.join(",");r.push(`${a};${n}`);break}default:throw new Error(`unsupported input dependency: ${t[i]}`)}}return r.join("|")},Ip=(e,t,r)=>{var a,n;let i=e.name;return(a=e.shaderCache)!=null&&a.hint&&(i+="["+e.shaderCache.hint+"]"),i+=":"+r+`:${Ep(t,((n=e.shaderCache)==null?void 0:n.inputDependencies)??new Array(t.length).fill("dims"))}`,i},kp=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Cp=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],i={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r},a=n=>t.features.has(n)&&r.push(n)&&!0;a("chromium-experimental-timestamp-query-inside-passes")||a("timestamp-query"),a("shader-f16"),a("subgroups"),this.device=await t.requestDevice(i),this.adapterInfo=new kp(t.info||await t.requestAdapterInfo()),this.gpuDataManager=Ia(this),this.programManager=new Sp(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,hi(e.logLevel,!!e.debug),this.device.onuncapturederror=n=>{n.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${n.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;pt(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var i;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let n=r[a],s=n.kernelId,o=this.kernels.get(s),u=o.kernelType,l=o.kernelName,d=n.programName,p=n.inputTensorViews,f=n.outputTensorViews,h=t[a*2],m=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=h);let y=Number(h-this.queryTimeBase),$=Number(m-this.queryTimeBase);if(!Number.isSafeInteger(y)||!Number.isSafeInteger($))throw new RangeError("incorrect timestamp range");if((i=this.env.webgpu.profiling)!=null&&i.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:p.map(w=>({dims:w.dims,dataType:kt(w.dataType)})),outputsMetadata:f.map(w=>({dims:w.dims,dataType:kt(w.dataType)})),kernelId:s,kernelType:u,kernelName:l,programName:d,startTime:y,endTime:$});else{let w="";p.forEach((T,x)=>{w+=`input[${x}]: [${T.dims}] | ${kt(T.dataType)}, `});let _="";f.forEach((T,x)=>{_+=`output[${x}]: [${T.dims}] | ${kt(T.dataType)}, `}),console.log(`[profiling] kernel "${s}|${u}|${l}|${d}" ${w}${_}execution time: ${$-y} ns`)}dt("GPU",`${d}::${h}::${m}`)}e.unmap(),this.pendingQueries.delete(e)}),ut()}run(e,t,r,i,a,n){pt(e.name);let s=[];for(let _=0;_<t.length;++_){let T=t[_].data;if(T===0)continue;let x=this.gpuDataManager.get(T);if(!x)throw new Error(`no GPU data for input: ${T}`);s.push(x)}let{outputs:o,dispatchGroup:u,programUniforms:l}=e.getRunData(t),d=r.length===0?o.map((_,T)=>T):r;if(d.length!==o.length)throw new Error(`Output size ${d.length} must be equal to ${o.length}.`);let p=[],f=[];for(let _=0;_<o.length;++_){if(!Number.isInteger(d[_])||d[_]<-3||d[_]>=n)throw new Error(`Invalid output index: ${d[_]}`);if(d[_]===-3)continue;let T=d[_]===-1,x=d[_]===-2,z=T||x?a(o[_].dataType,o[_].dims):i(d[_],o[_].dataType,o[_].dims);if(p.push(z),z.data===0)continue;let D=this.gpuDataManager.get(z.data);if(!D)throw new Error(`no GPU data for output: ${z.data}`);if(T&&this.temporaryData.push(D),x){let B=this.kernelPersistentData.get(this.currentKernelId);B||(B=[],this.kernelPersistentData.set(this.currentKernelId,B)),B.push(D)}f.push(D)}if(s.length!==t.length||f.length!==p.length){if(f.length===0)return ut(e.name),p;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let h;if(l){let _=0,T=[];l.forEach(B=>{let L=typeof B.data=="number"?[B.data]:B.data;if(L.length===0)return;let q=B.type===10?2:4,ee,we;B.type===10?(we=L.length>4?16:L.length>2?8:L.length*q,ee=L.length>4?16:q*L.length):(we=L.length<=2?L.length*q:16,ee=16),_=Math.ceil(_/we)*we,T.push(_);let ue=B.type===10?8:4;_+=L.length>4?Math.ceil(L.length/ue)*ee:L.length*q});let x=16;_=Math.ceil(_/x)*x;let z=new ArrayBuffer(_);l.forEach((B,L)=>{let q=T[L],ee=typeof B.data=="number"?[B.data]:B.data;if(B.type===6)new Int32Array(z,q,ee.length).set(ee);else if(B.type===12)new Uint32Array(z,q,ee.length).set(ee);else if(B.type===10)new Uint16Array(z,q,ee.length).set(ee);else if(B.type===1)new Float32Array(z,q,ee.length).set(ee);else throw new Error(`Unsupported uniform type: ${kt(B.type)}`)});let D=this.gpuDataManager.create(_,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(D.buffer,0,z,0,_),this.gpuDataManager.release(D.id),h={offset:0,size:_,buffer:D.buffer}}let m=this.programManager.normalizeDispatchGroupSize(u),y=m[1]===1&&m[2]===1,$=Ip(e,t,y),w=this.programManager.getArtifact($);if(w||(w=this.programManager.build(e,m),this.programManager.setArtifact($,w),Re("info",()=>`[artifact] key: ${$}, programName: ${e.name}`)),l&&w.uniformVariablesInfo){if(l.length!==w.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${w.uniformVariablesInfo.length}, got ${l.length} in program "${w.programInfo.name}".`);for(let _=0;_<l.length;_++){let T=l[_],x=T.type,z=typeof T.data=="number"?1:T.data.length,[D,B]=w.uniformVariablesInfo[_];if(x!==D||z!==B)throw new Error(`Uniform variable ${_} mismatch: expect type ${D} with size ${B}, got type ${x} with size ${z} in program "${w.programInfo.name}".`)}}if(Re("info",()=>`[ProgramManager] run "${e.name}" (key=${$}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let _={kernelId:this.currentKernelId,programName:w.programInfo.name,inputTensorViews:t,outputTensorViews:p};this.pendingKernels.push(_),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(_)}return this.programManager.run(w,s,f,m,h),ut(e.name),p}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,i){let a=xp.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let n={kernelType:e,kernelName:i,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,n)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let i=this.kernels.get(e);if(!i)throw new Error(`kernel not created: ${e}`);let a=i.kernelType,n=i.kernelName,s=i.kernelEntry,o=i.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${n}" is not allowed to be called recursively`);this.currentKernelId=e,o[0]&&(o[1]=o[0](o[1]),o[0]=void 0),Re("info",()=>`[WebGPU] Start to run kernel "[${a}] ${n}"...`);let u=this.env.debug;this.temporaryData=[];try{return u&&this.device.pushErrorScope("validation"),s(t,o[1]),0}catch(l){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${n}" failed. ${l}`)),1}finally{u&&r.push(this.device.popErrorScope().then(l=>l?`GPU validation error for kernel "[${a}] ${n}": ${l.message}`:null));for(let l of this.temporaryData)this.gpuDataManager.release(l.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,i){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let n=a.get(t),s=this.gpuDataManager.registerExternalBuffer(r,i,n);return a.set(t,[s,r]),s}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let i=await sa(this,e,t);return tr(i.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){Re("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){Re("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){Re("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let i=0;i<r;i++){let a=this.getComputePassEncoder(),n=e[i];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(n.computePipeline),a.setBindGroup(0,n.bindGroup),a.dispatchWorkgroups(...n.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[i]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),zp={};se(zp,{init:()=>Op});var La,Ap,Op,yf=E(()=>{$e(),Bt(),fe(),na(),La=class yc{constructor(t,r,i,a){this.module=t,this.dataType=r,this.data=i,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=U.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=U.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=U.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=U.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(U.size(t)!==U.size(this.dims))throw new Error("Invalid new shape");return new yc(this.module,this.dataType,this.data,t)}},Ap=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let i=e.PTR_SIZE,a=r/e.PTR_SIZE,n=i===4?"i32":"i64";this.opKernelContext=Number(e.getValue(i*a++,n));let s=Number(e.getValue(i*a++,n));this.outputCount=Number(e.getValue(i*a++,n)),this.customDataOffset=Number(e.getValue(i*a++,"*")),this.customDataSize=Number(e.getValue(i*a++,n));let o=[];for(let u=0;u<s;u++){let l=Number(e.getValue(i*a++,n)),d=Number(e.getValue(i*a++,"*")),p=Number(e.getValue(i*a++,n)),f=[];for(let h=0;h<p;h++)f.push(Number(e.getValue(i*a++,n)));o.push(new La(e,l,d,f))}this.inputs=o}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var s;let r=((s=t==null?void 0:t.inputs)==null?void 0:s.map(o=>typeof o=="number"?this.inputs[o]:o))??this.inputs,i=(t==null?void 0:t.outputs)??[],a=(o,u,l)=>new La(this.module,u,this.output(o,l),l),n=(o,u)=>{let l=Ct(o,u);if(!l)throw new Error(`Unsupported data type: ${o}`);let d=l>0?this.backend.gpuDataManager.create(l).id:0;return new La(this.module,o,d,u)};return this.backend.run(e,r,i,a,n,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let i=this.module.PTR_SIZE,a=i===4?"i32":"i64",n=this.module.stackAlloc((1+t.length)*i);this.module.setValue(n,t.length,a);for(let s=0;s<t.length;s++)this.module.setValue(n+i*(s+1),t[s],a);return this.module._JsepOutput(this.opKernelContext,e,n)}catch(i){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${i}`)}finally{this.module.stackRestore(r)}}},Op=async(e,t,r,i)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let n=(gf(),be(Tp)).WebGpuBackend,s=new n;await s.initialize(r,i),a("webgpu",[s,o=>s.alloc(Number(o)),o=>s.free(o),(o,u,l,d=!1)=>{if(d)Re("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(o)}, dst=${Number(u)}, size=${Number(l)}`),s.memcpy(Number(o),Number(u));else{Re("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(o)}, gpuDataId=${Number(u)}, size=${Number(l)}`);let p=t.HEAPU8.subarray(Number(o>>>0),Number(o>>>0)+Number(l));s.upload(Number(u),p)}},async(o,u,l)=>{Re("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${o}, dataOffset=${u}, size=${l}`),await s.download(Number(o),()=>t.HEAPU8.subarray(Number(u)>>>0,Number(u+l)>>>0))},(o,u,l)=>s.createKernel(o,Number(u),l,t.UTF8ToString(t._JsepGetNodeName(Number(u)))),o=>s.releaseKernel(o),(o,u,l,d)=>{Re("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${o}, contextDataOffset=${u}`);let p=new Ap(t,s,Number(u));return s.computeKernel(Number(o),p,d)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let n=new aa(r);a("webnn",[n,()=>n.reserveTensorId(),s=>n.releaseTensorId(s),async(s,o,u,l,d)=>n.ensureTensor(s,o,u,l,d),(s,o)=>{n.uploadTensor(s,o)},async(s,o)=>n.downloadTensor(s,o)])}}}),Rp,Xn,Yn,wr,Mp,Jn,Va,es,ts,rs,is,as,ns,Bp=E(()=>{rn(),an(),$e(),Et(),Lr(),Yi(),Rp=(e,t)=>{xe()._OrtInit(e,t)!==0&&_e("Can't initialize onnxruntime.")},Xn=async e=>{Rp(e.wasm.numThreads,qr(e.logLevel))},Yn=async(e,t)=>{var r,i;(i=(r=xe()).asyncInit)==null||i.call(r);{let a=(yf(),be(zp)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let n=e.webgpu.adapter;if(n){if(typeof n.limits!="object"||typeof n.features!="object"||typeof n.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let s=e.webgpu.powerPreference;if(s!==void 0&&s!=="low-power"&&s!=="high-performance")throw new Error(`Invalid powerPreference setting: "${s}"`);let o=e.webgpu.forceFallbackAdapter;if(o!==void 0&&typeof o!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${o}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:s,forceFallbackAdapter:o}),!n)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await a("webgpu",xe(),e,n)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await a("webnn",xe(),e)}}},wr=new Map,Mp=e=>{let t=xe(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetInputOutputCount(e,a,a+i)!==0&&_e("Can't get session input/output count.");let n=i===4?"i32":"i64";return[Number(t.getValue(a,n)),Number(t.getValue(a+i,n))]}finally{t.stackRestore(r)}},Jn=(e,t)=>{let r=xe(),i=r.stackSave(),a=0;try{let n=r.PTR_SIZE,s=r.stackAlloc(2*n);r._OrtGetInputOutputMetadata(e,t,s,s+n)!==0&&_e("Can't get session input/output metadata.");let o=Number(r.getValue(s,"*"));a=Number(r.getValue(s+n,"*"));let u=r.HEAP32[a/4];if(u===0)return[o,0];let l=r.HEAPU32[a/4+1],d=[];for(let p=0;p<l;p++){let f=Number(r.getValue(a+8+p*n,"*"));d.push(f!==0?r.UTF8ToString(f):Number(r.getValue(a+8+(p+l)*n,"*")))}return[o,u,d]}finally{r.stackRestore(i),a!==0&&r._OrtFree(a)}},Va=e=>{let t=xe(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},es=async(e,t)=>{var p,f,h,m;let r,i,a=xe();Array.isArray(e)?[r,i]=e:e.buffer===a.HEAPU8.buffer?[r,i]=[e.byteOffset,e.byteLength]:[r,i]=Va(e);let n=0,s=0,o=0,u=[],l=[],d=[];try{if([s,u]=await Xi(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let L=[];for(let q of t.externalData){let ee=typeof q=="string"?q:q.path;L.push(Gr(typeof q=="string"?q:q.data).then(we=>{a.mountExternalData(ee,we)}))}await Promise.all(L)}for(let L of(t==null?void 0:t.executionProviders)??[])if((typeof L=="string"?L:L.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,typeof L!="string"){let q=L,ee=q==null?void 0:q.context,we=q==null?void 0:q.gpuDevice,ue=q==null?void 0:q.deviceType,ge=q==null?void 0:q.powerPreference;ee?a.currentContext=ee:we?a.currentContext=await a.webnnCreateMLContext(we):a.currentContext=await a.webnnCreateMLContext({deviceType:ue,powerPreference:ge})}else a.currentContext=await a.webnnCreateMLContext();break}n=await a._OrtCreateSession(r,i,s),(p=a.webgpuOnCreateSession)==null||p.call(a,n),n===0&&_e("Can't create a session."),(f=a.jsepOnCreateSession)==null||f.call(a),a.currentContext&&(a.webnnRegisterMLContext(n,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[y,$]=Mp(n),w=!!(t!=null&&t.enableGraphCapture),_=[],T=[],x=[],z=[],D=[];for(let L=0;L<y;L++){let[q,ee,we]=Jn(n,L);q===0&&_e("Can't get an input name."),l.push(q);let ue=a.UTF8ToString(q);_.push(ue),x.push(ee===0?{name:ue,isTensor:!1}:{name:ue,isTensor:!0,type:kt(ee),shape:we})}for(let L=0;L<$;L++){let[q,ee,we]=Jn(n,L+y);q===0&&_e("Can't get an output name."),d.push(q);let ue=a.UTF8ToString(q);T.push(ue),z.push(ee===0?{name:ue,isTensor:!1}:{name:ue,isTensor:!0,type:kt(ee),shape:we});{if(w&&(t==null?void 0:t.preferredOutputLocation)===void 0){D.push("gpu-buffer");continue}let ge=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((h=t==null?void 0:t.preferredOutputLocation)==null?void 0:h[ue])??"cpu",qe=a.webnnIsGraphOutput;if(ge==="cpu"&&qe&&qe(n,ue)){D.push("ml-tensor-cpu-output");continue}if(ge!=="cpu"&&ge!=="cpu-pinned"&&ge!=="gpu-buffer"&&ge!=="ml-tensor")throw new Error(`Not supported preferred output location: ${ge}.`);if(w&&ge!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${ge}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);D.push(ge)}}let B=null;return D.some(L=>L==="gpu-buffer"||L==="ml-tensor"||L==="ml-tensor-cpu-output")&&(o=a._OrtCreateBinding(n),o===0&&_e("Can't create IO binding."),B={handle:o,outputPreferredLocations:D,outputPreferredLocationsEncoded:D.map(L=>L==="ml-tensor-cpu-output"?"ml-tensor":L).map(L=>pi(L))}),wr.set(n,[n,l,d,B,w,!1]),[n,_,T,x,z]}catch(y){throw l.forEach($=>a._OrtFree($)),d.forEach($=>a._OrtFree($)),o!==0&&a._OrtReleaseBinding(o)!==0&&_e("Can't release IO binding."),n!==0&&a._OrtReleaseSession(n)!==0&&_e("Can't release session."),y}finally{a._free(r),s!==0&&a._OrtReleaseSessionOptions(s)!==0&&_e("Can't release session options."),u.forEach(y=>a._free(y)),(m=a.unmountExternalData)==null||m.call(a)}},ts=e=>{var u,l,d;let t=xe(),r=wr.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[i,a,n,s,o]=r;s&&(o&&t._OrtClearBoundOutputs(s.handle)!==0&&_e("Can't clear bound outputs."),t._OrtReleaseBinding(s.handle)!==0&&_e("Can't release IO binding.")),(u=t.jsepOnReleaseSession)==null||u.call(t,e),(l=t.webnnOnReleaseSession)==null||l.call(t,e),(d=t.webgpuOnReleaseSession)==null||d.call(t,e),a.forEach(p=>t._OrtFree(p)),n.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(i)!==0&&_e("Can't release session."),wr.delete(e)},rs=async(e,t,r,i,a,n,s=!1)=>{if(!e){t.push(0);return}let o=xe(),u=o.PTR_SIZE,l=e[0],d=e[1],p=e[3],f=p,h,m;if(l==="string"&&(p==="gpu-buffer"||p==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&p!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${n} when enableGraphCapture is true.`);if(p==="gpu-buffer"){let w=e[2].gpuBuffer;m=Ct(It(l),d);{let _=o.jsepRegisterBuffer;if(!_)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');h=_(i,n,w,m)}}else if(p==="ml-tensor"){let w=e[2].mlTensor;m=Ct(It(l),d);let _=o.webnnRegisterMLTensor;if(!_)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');h=_(i,w,It(l),d)}else{let w=e[2];if(Array.isArray(w)){m=u*w.length,h=o._malloc(m),r.push(h);for(let _=0;_<w.length;_++){if(typeof w[_]!="string")throw new TypeError(`tensor data at index ${_} is not a string`);o.setValue(h+_*u,tt(w[_],r),"*")}}else{let _=o.webnnIsGraphInput,T=o.webnnIsGraphOutput;if(l!=="string"&&_&&T){let x=o.UTF8ToString(a);if(_(i,x)||T(i,x)){let z=It(l);m=Ct(z,d),f="ml-tensor";let D=o.webnnCreateTemporaryTensor,B=o.webnnUploadTensor;if(!D||!B)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let L=await D(i,z,d);B(L,new Uint8Array(w.buffer,w.byteOffset,w.byteLength)),h=L}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}else m=w.byteLength,h=o._malloc(m),r.push(h),o.HEAPU8.set(new Uint8Array(w.buffer,w.byteOffset,m),h)}}let y=o.stackSave(),$=o.stackAlloc(4*d.length);try{d.forEach((_,T)=>o.setValue($+T*u,_,u===4?"i32":"i64"));let w=o._OrtCreateTensor(It(l),h,m,$,d.length,pi(f));w===0&&_e(`Can't create tensor for input/output. session=${i}, index=${n}.`),t.push(w)}finally{o.stackRestore(y)}},is=async(e,t,r,i,a,n)=>{var we,ue,ge,qe;let s=xe(),o=s.PTR_SIZE,u=wr.get(e);if(!u)throw new Error(`cannot run inference. invalid session id: ${e}`);let l=u[0],d=u[1],p=u[2],f=u[3],h=u[4],m=u[5],y=t.length,$=i.length,w=0,_=[],T=[],x=[],z=[],D=s.stackSave(),B=s.stackAlloc(y*o),L=s.stackAlloc(y*o),q=s.stackAlloc($*o),ee=s.stackAlloc($*o);try{[w,_]=ji(n);for(let pe=0;pe<y;pe++)await rs(r[pe],T,z,e,d[t[pe]],t[pe],h);for(let pe=0;pe<$;pe++)await rs(a[pe],x,z,e,p[i[pe]],y+i[pe],h);for(let pe=0;pe<y;pe++)s.setValue(B+pe*o,T[pe],"*"),s.setValue(L+pe*o,d[t[pe]],"*");for(let pe=0;pe<$;pe++)s.setValue(q+pe*o,x[pe],"*"),s.setValue(ee+pe*o,p[i[pe]],"*");if(f&&!m){let{handle:pe,outputPreferredLocations:Se,outputPreferredLocationsEncoded:wt}=f;if(d.length!==y)throw new Error(`input count from feeds (${y}) is expected to be always equal to model's input count (${d.length}).`);for(let G=0;G<y;G++){let te=t[G];await s._OrtBindInput(pe,d[te],T[G])!==0&&_e(`Can't bind input[${G}] for session=${e}.`)}for(let G=0;G<$;G++){let te=i[G];(we=a[G])!=null&&we[3]?s._OrtBindOutput(pe,p[te],x[G],0)!==0&&_e(`Can't bind pre-allocated output[${G}] for session=${e}.`):s._OrtBindOutput(pe,p[te],0,wt[te])!==0&&_e(`Can't bind output[${G}] to ${Se[G]} for session=${e}.`)}wr.set(e,[l,d,p,f,h,!0])}(ue=s.jsepOnRunStart)==null||ue.call(s,l),(ge=s.webnnOnRunStart)==null||ge.call(s,l);let ke;f?ke=await s._OrtRunWithBinding(l,f.handle,$,q,w):ke=await s._OrtRun(l,L,B,y,ee,$,q,w),ke!==0&&_e("failed to call OrtRun().");let he=[],ze=[];for(let pe=0;pe<$;pe++){let Se=Number(s.getValue(q+pe*o,"*"));if(Se===x[pe]){he.push(a[pe]);continue}let wt=s.stackSave(),G=s.stackAlloc(4*o),te=!1,me,Oe=0;try{s._OrtGetTensorData(Se,G,G+o,G+2*o,G+3*o)!==0&&_e(`Can't access output tensor data on index ${pe}.`);let Pt=o===4?"i32":"i64",Ci=Number(s.getValue(G,Pt));Oe=s.getValue(G+o,"*");let Qp=s.getValue(G+o*2,"*"),vf=Number(s.getValue(G+o*3,Pt)),$r=[];for(let _t=0;_t<vf;_t++)$r.push(Number(s.getValue(Qp+_t*o,Pt)));s._OrtFree(Qp)!==0&&_e("Can't free memory for tensor dims.");let vr=$r.reduce((_t,st)=>_t*st,1);me=kt(Ci);let ba=f==null?void 0:f.outputPreferredLocations[i[pe]];if(me==="string"){if(ba==="gpu-buffer"||ba==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let _t=[];for(let st=0;st<vr;st++){let fr=s.getValue(Oe+st*o,"*"),xf=s.getValue(Oe+(st+1)*o,"*"),Sf=st===vr-1?void 0:xf-fr;_t.push(s.UTF8ToString(fr,Sf))}he.push([me,$r,_t,"cpu"])}else if(ba==="gpu-buffer"&&vr>0){let _t=s.jsepGetBuffer;if(!_t)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let st=_t(Oe),fr=Ct(Ci,vr);if(fr===void 0||!Fr(me))throw new Error(`Unsupported data type: ${me}`);te=!0,he.push([me,$r,{gpuBuffer:st,download:s.jsepCreateDownloader(st,fr,me),dispose:()=>{s._OrtReleaseTensor(Se)!==0&&_e("Can't release tensor.")}},"gpu-buffer"])}else if(ba==="ml-tensor"&&vr>0){let _t=s.webnnEnsureTensor,st=s.webnnIsGraphInputOutputTypeSupported;if(!_t||!st)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Ct(Ci,vr)===void 0||!Wr(me))throw new Error(`Unsupported data type: ${me}`);if(!st(e,me,!1))throw new Error(`preferredLocation "ml-tensor" for ${me} output is not supported by current WebNN Context.`);let fr=await _t(e,Oe,Ci,$r,!1);te=!0,he.push([me,$r,{mlTensor:fr,download:s.webnnCreateMLTensorDownloader(Oe,me),dispose:()=>{s.webnnReleaseTensorId(Oe),s._OrtReleaseTensor(Se)}},"ml-tensor"])}else if(ba==="ml-tensor-cpu-output"&&vr>0){let _t=s.webnnCreateMLTensorDownloader(Oe,me)(),st=he.length;te=!0,ze.push((async()=>{let fr=[st,await _t];return s.webnnReleaseTensorId(Oe),s._OrtReleaseTensor(Se),fr})()),he.push([me,$r,[],"cpu"])}else{let _t=Vr(me),st=new _t(vr);new Uint8Array(st.buffer,st.byteOffset,st.byteLength).set(s.HEAPU8.subarray(Oe,Oe+st.byteLength)),he.push([me,$r,st,"cpu"])}}finally{s.stackRestore(wt),me==="string"&&Oe&&s._free(Oe),te||s._OrtReleaseTensor(Se)}}f&&!h&&(s._OrtClearBoundOutputs(f.handle)!==0&&_e("Can't clear bound outputs."),wr.set(e,[l,d,p,f,h,!1]));for(let[pe,Se]of await Promise.all(ze))he[pe][2]=Se;return he}finally{(qe=s.webnnOnRunEnd)==null||qe.call(s,l),s.stackRestore(D),T.forEach(ke=>s._OrtReleaseTensor(ke)),x.forEach(ke=>s._OrtReleaseTensor(ke)),z.forEach(ke=>s._free(ke)),w!==0&&s._OrtReleaseRunOptions(w),_.forEach(ke=>s._free(ke))}},as=e=>{let t=xe(),r=wr.get(e);if(!r)throw new Error("invalid session id");let i=r[0],a=t._OrtEndProfiling(i);a===0&&_e("Can't get an profile file name."),t._OrtFree(a)},ns=e=>{let t=[];for(let r of e){let i=r[2];!Array.isArray(i)&&"buffer"in i&&t.push(i.buffer)}return t}}),br,At,ki,_a,wa,qa,ss,Fa,ai,ni,Dp,Pp,Up,Np,Lp,Vp,qp,Fp,Wp=E(()=>{ht(),Bp(),Et(),Dr(),br=()=>!!Q.wasm.proxy&&typeof document<"u",ki=!1,_a=!1,wa=!1,Fa=new Map,ai=(e,t)=>{let r=Fa.get(e);r?r.push(t):Fa.set(e,[t])},ni=()=>{if(ki||!_a||wa||!At)throw new Error("worker not ready")},Dp=e=>{switch(e.data.type){case"init-wasm":ki=!1,e.data.err?(wa=!0,ss[1](e.data.err)):(_a=!0,ss[0]()),qa&&(URL.revokeObjectURL(qa),qa=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Fa.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Pp=async()=>{if(!_a){if(ki)throw new Error("multiple calls to 'initWasm()' detected.");if(wa)throw new Error("previous call to 'initWasm()' failed.");if(ki=!0,br())return new Promise((e,t)=>{At==null||At.terminate(),Vi().then(([r,i])=>{try{At=i,At.onerror=n=>t(n),At.onmessage=Dp,ss=[e,t];let a={type:"init-wasm",in:Q};if(!a.in.wasm.wasmPaths&&r){let n=Or();n&&(a.in.wasm.wasmPaths=n)}At.postMessage(a),qa=r}catch(a){t(a)}},t)});try{await Nr(Q.wasm),await Xn(Q),_a=!0}catch(e){throw wa=!0,e}finally{ki=!1}}},Up=async e=>{if(br())return ni(),new Promise((t,r)=>{ai("init-ep",[t,r]);let i={type:"init-ep",in:{epName:e,env:Q}};At.postMessage(i)});await Yn(Q,e)},Np=async e=>br()?(ni(),new Promise((t,r)=>{ai("copy-from",[t,r]);let i={type:"copy-from",in:{buffer:e}};At.postMessage(i,[e.buffer])})):Va(e),Lp=async(e,t)=>{if(br()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return ni(),new Promise((r,i)=>{ai("create",[r,i]);let a={type:"create",in:{model:e,options:{...t}}},n=[];e instanceof Uint8Array&&n.push(e.buffer),At.postMessage(a,n)})}else return es(e,t)},Vp=async e=>{if(br())return ni(),new Promise((t,r)=>{ai("release",[t,r]);let i={type:"release",in:e};At.postMessage(i)});ts(e)},qp=async(e,t,r,i,a,n)=>{if(br()){if(r.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return ni(),new Promise((s,o)=>{ai("run",[s,o]);let u=r,l={type:"run",in:{sessionId:e,inputIndices:t,inputs:u,outputIndices:i,options:n}};At.postMessage(l,ns(u))})}else return is(e,t,r,i,a,n)},Fp=async e=>{if(br())return ni(),new Promise((t,r)=>{ai("end-profiling",[t,r]);let i={type:"end-profiling",in:e};At.postMessage(i)});as(e)}}),os,Gp,jp,_f=E(()=>{ht(),Wp(),$e(),Cr(),Yi(),os=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},Gp=e=>{switch(e[3]){case"cpu":return new Le(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Fr(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:i,dispose:a}=e[2];return Le.fromGpuBuffer(r,{dataType:t,dims:e[1],download:i,dispose:a})}case"ml-tensor":{let t=e[0];if(!Wr(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:i,dispose:a}=e[2];return Le.fromMLTensor(r,{dataType:t,dims:e[1],download:i,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},jp=class{async fetchModelAndCopyToWasmMemory(e){return Np(await Gr(e))}async loadModel(e,t){pt();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Lp(r,t),ut()}async dispose(){return Vp(this.sessionId)}async run(e,t,r){pt();let i=[],a=[];Object.entries(e).forEach(p=>{let f=p[0],h=p[1],m=this.inputNames.indexOf(f);if(m===-1)throw new Error(`invalid input '${f}'`);i.push(h),a.push(m)});let n=[],s=[];Object.entries(t).forEach(p=>{let f=p[0],h=p[1],m=this.outputNames.indexOf(f);if(m===-1)throw new Error(`invalid output '${f}'`);n.push(h),s.push(m)});let o=i.map((p,f)=>os(p,()=>`input "${this.inputNames[a[f]]}"`)),u=n.map((p,f)=>p?os(p,()=>`output "${this.outputNames[s[f]]}"`):null),l=await qp(this.sessionId,a,o,s,u,r),d={};for(let p=0;p<l.length;p++)d[this.outputNames[s[p]]]=n[p]??Gp(l[p]);return ut(),d}startProfiling(){}endProfiling(){Fp(this.sessionId)}}}),Hp={};se(Hp,{OnnxruntimeWebAssemblyBackend:()=>ls,initializeFlags:()=>us,wasmBackend:()=>Kp});var us,ls,Kp,wf=E(()=>{ht(),Wp(),_f(),us=()=>{(typeof Q.wasm.initTimeout!="number"||Q.wasm.initTimeout<0)&&(Q.wasm.initTimeout=0);let e=Q.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),Q.wasm.simd=!1),typeof Q.wasm.proxy!="boolean"&&(Q.wasm.proxy=!1),typeof Q.wasm.trace!="boolean"&&(Q.wasm.trace=!1),typeof Q.wasm.numThreads!="number"||!Number.isInteger(Q.wasm.numThreads)||Q.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)Q.wasm.numThreads=1;else{let t=typeof navigator>"u"?ne("node:os").cpus().length:navigator.hardwareConcurrency;Q.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},ls=class{async init(e){us(),await Pp(),await Up(e)}async createInferenceSessionHandler(e,t){let r=new jp;return await r.loadModel(e,t),r}},Kp=new ls}),Zp={};se(Zp,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>Le,default:()=>$f,env:()=>Q,registerBackend:()=>ye}),ht(),ht(),ht();var bf="1.22.0",$f=Ri;{let e=(wf(),be(Hp)).wasmBackend;ye("webgpu",e,5),ye("webnn",e,5),ye("cpu",e,10),ye("wasm",e,10)}return Object.defineProperty(Q.versions,"web",{value:bf,enumerable:!0}),be(Zp)})();/**
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
 */v.exports=W})(mc);var Hf=mc.exports,ms={},_c={};Object.defineProperty(_c,"__esModule",{value:!0});var Ha={},wc;Object.defineProperty(Ha,"__esModule",{value:!0});Ha.SileroLegacy=void 0;const nc=Sr;class gs{constructor(O,W,H,N,Z){this.ortInstance=O,this._session=W,this._h=H,this._c=N,this._sr=Z,this.reset_state=()=>{const ie=Array(128).fill(0);this._h=new this.ortInstance.Tensor("float32",ie,[2,1,64]),this._c=new this.ortInstance.Tensor("float32",ie,[2,1,64])},this.process=async ie=>{var le;const E={input:new this.ortInstance.Tensor("float32",ie,[1,ie.length]),h:this._h,c:this._c,sr:this._sr},se=await this._session.run(E);this._h=se.hn,this._c=se.cn;const[Me]=(le=se.output)==null?void 0:le.data;return{notSpeech:1-Me,isSpeech:Me}},this.release=async()=>{await this._session.release(),this._h.dispose(),this._c.dispose(),this._sr.dispose()}}}Ha.SileroLegacy=gs;wc=gs;gs.new=async(v,O)=>{nc.log.debug("initializing vad");const W=await O(),H=await v.InferenceSession.create(W),N=new v.Tensor("int64",[16000n]),Z=Array(2*64).fill(0),ie=new v.Tensor("float32",Z,[2,1,64]),ne=new v.Tensor("float32",Z,[2,1,64]);return nc.log.debug("vad is initialized"),new wc(v,H,ie,ne,N)};var Ka={},bc;Object.defineProperty(Ka,"__esModule",{value:!0});Ka.SileroV5=void 0;const sc=Sr;function $c(v){const O=Array(256).fill(0);return new v.Tensor("float32",O,[2,1,128])}class ys{constructor(O,W,H,N){this._session=O,this._state=W,this._sr=H,this.ortInstance=N,this.reset_state=()=>{this._state=$c(this.ortInstance)},this.process=async Z=>{var be;const ne={input:new this.ortInstance.Tensor("float32",Z,[1,Z.length]),state:this._state,sr:this._sr},E=await this._session.run(ne);if(!E.stateN)throw new Error("No state from model");if(this._state=E.stateN,!((be=E.output)!=null&&be.data))throw new Error("No output from model");const se=E.output.data[0];if(typeof se!="number")throw new Error("Weird output data");return{notSpeech:1-se,isSpeech:se}},this.release=async()=>{await this._session.release(),this._state.dispose(),this._sr.dispose()}}}Ka.SileroV5=ys;bc=ys;ys.new=async(v,O)=>{sc.log.debug("Loading VAD...");const W=await O(),H=await v.InferenceSession.create(W),N=new v.Tensor("int64",[16000n]),Z=$c(v);return sc.log.debug("...finished loading VAD"),new bc(H,Z,N,v)};(function(v){var O=vt&&vt.__createBinding||(Object.create?function(Z,ie,ne,E){E===void 0&&(E=ne);var se=Object.getOwnPropertyDescriptor(ie,ne);(!se||("get"in se?!ie.__esModule:se.writable||se.configurable))&&(se={enumerable:!0,get:function(){return ie[ne]}}),Object.defineProperty(Z,E,se)}:function(Z,ie,ne,E){E===void 0&&(E=ne),Z[E]=ie[ne]}),W=vt&&vt.__exportStar||function(Z,ie){for(var ne in Z)ne!=="default"&&!Object.prototype.hasOwnProperty.call(ie,ne)&&O(ie,Z,ne)};Object.defineProperty(v,"__esModule",{value:!0}),v.SileroV5=v.SileroLegacy=void 0,W(_c,v);var H=Ha;Object.defineProperty(v,"SileroLegacy",{enumerable:!0,get:function(){return H.SileroLegacy}});var N=Ka;Object.defineProperty(v,"SileroV5",{enumerable:!0,get:function(){return N.SileroV5}})})(ms);var Ta={};Object.defineProperty(Ta,"__esModule",{value:!0});Ta.Resampler=void 0;const Kf=Sr;class Zf{constructor(O){this.options=O,this.process=W=>{const H=[];for(const N of W)for(this.inputBuffer.push(N);this.hasEnoughDataForFrame();){const Z=this.generateOutputFrame();H.push(Z)}return H},O.nativeSampleRate<16e3&&Kf.log.error("nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"),this.inputBuffer=[]}async*stream(O){for(const W of O)for(this.inputBuffer.push(W);this.hasEnoughDataForFrame();)yield this.generateOutputFrame()}hasEnoughDataForFrame(){return this.inputBuffer.length*this.options.targetSampleRate/this.options.nativeSampleRate>=this.options.targetFrameSize}generateOutputFrame(){const O=new Float32Array(this.options.targetFrameSize);let W=0,H=0;for(;W<this.options.targetFrameSize;){let N=0,Z=0;for(;H<Math.min(this.inputBuffer.length,(W+1)*this.options.nativeSampleRate/this.options.targetSampleRate);){const ie=this.inputBuffer[H];ie!==void 0&&(N+=ie,Z++),H++}O[W]=N/Z,W++}return this.inputBuffer=this.inputBuffer.slice(H),O}}Ta.Resampler=Zf;(function(v){var O=vt&&vt.__createBinding||(Object.create?function(le,ve,ye,Ae){Ae===void 0&&(Ae=ye);var Ue=Object.getOwnPropertyDescriptor(ve,ye);(!Ue||("get"in Ue?!ve.__esModule:Ue.writable||Ue.configurable))&&(Ue={enumerable:!0,get:function(){return ve[ye]}}),Object.defineProperty(le,Ae,Ue)}:function(le,ve,ye,Ae){Ae===void 0&&(Ae=ye),le[Ae]=ve[ye]}),W=vt&&vt.__setModuleDefault||(Object.create?function(le,ve){Object.defineProperty(le,"default",{enumerable:!0,value:ve})}:function(le,ve){le.default=ve}),H=vt&&vt.__importStar||function(le){if(le&&le.__esModule)return le;var ve={};if(le!=null)for(var ye in le)ye!=="default"&&Object.prototype.hasOwnProperty.call(le,ye)&&O(ve,le,ye);return W(ve,le),ve};Object.defineProperty(v,"__esModule",{value:!0}),v.NonRealTimeVAD=v.defaultNonRealTimeVADOptions=void 0;const N=H(Hf),Z=Sa,ie=zi,ne=sr,E=li,se=ms,Me=Ta;v.defaultNonRealTimeVADOptions={...ne.defaultFrameProcessorOptions,modelURL:Z.baseAssetPath+"silero_vad_legacy.onnx",modelFetcher:ie.defaultModelFetcher};class be{static async new(ve={}){const ye={...v.defaultNonRealTimeVADOptions,...ve};(0,ne.validateOptions)(ye),ye.ortConfig!==void 0&&ye.ortConfig(N);const Ae=()=>ye.modelFetcher(ye.modelURL),Ue=await se.SileroLegacy.new(N,Ae),Fe=new ne.FrameProcessor(Ue.process,Ue.reset_state,{positiveSpeechThreshold:ye.positiveSpeechThreshold,negativeSpeechThreshold:ye.negativeSpeechThreshold,redemptionMs:ye.redemptionMs,preSpeechPadMs:ye.preSpeechPadMs,minSpeechMs:ye.minSpeechMs,submitUserSpeechOnPause:ye.submitUserSpeechOnPause},1536/16);return Fe.resume(),new this(Ae,N,ye,Fe)}constructor(ve,ye,Ae,Ue){this.modelFetcher=ve,this.ort=ye,this.options=Ae,this.frameProcessor=Ue,this.frameSamples=1536}async*run(ve,ye){const Ae={nativeSampleRate:ye,targetSampleRate:16e3,targetFrameSize:this.frameSamples},Ue=new Me.Resampler(Ae);let Fe=0,Ce=0,J=0;for await(const ae of Ue.stream(ve)){const V=[];await this.frameProcessor.process(ae,re=>{V.push(re)});for(const re of V)switch(re.msg){case E.Message.SpeechStart:Fe=J*this.frameSamples/16;break;case E.Message.SpeechEnd:Ce=(J+1)*this.frameSamples/16,yield{audio:re.audio,start:Fe,end:Ce};break}J++}const ce=[];this.frameProcessor.endSegment(ae=>{ce.push(ae)});for(const ae of ce)switch(ae.msg){case E.Message.SpeechEnd:yield{audio:ae.audio,start:Fe,end:J*this.frameSamples/16}}}}v.NonRealTimeVAD=be})(hc);var nr={};Object.defineProperty(nr,"__esModule",{value:!0});nr.audioFileToArray=nr.encodeWAV=nr.arrayBufferToBase64=nr.minFramesForTargetMS=void 0;function Qf(v,O,W=16e3){return Math.ceil(v*W/1e3/O)}nr.minFramesForTargetMS=Qf;function Xf(v){const O=new Uint8Array(v),W=O.byteLength,H=new Array(W);for(let N=0;N<W;N++){const Z=O[N];if(Z===void 0)break;H[N]=String.fromCharCode(Z)}return btoa(H.join(""))}nr.arrayBufferToBase64=Xf;function Yf(v,O=3,W=16e3,H=1,N=32){const Z=N/8,ie=H*Z,ne=new ArrayBuffer(44+v.length*Z),E=new DataView(ne);return Wa(E,0,"RIFF"),E.setUint32(4,36+v.length*Z,!0),Wa(E,8,"WAVE"),Wa(E,12,"fmt "),E.setUint32(16,16,!0),E.setUint16(20,O,!0),E.setUint16(22,H,!0),E.setUint32(24,W,!0),E.setUint32(28,W*ie,!0),E.setUint16(32,ie,!0),E.setUint16(34,N,!0),Wa(E,36,"data"),E.setUint32(40,v.length*Z,!0),O===1?eh(E,44,v):Jf(E,44,v),ne}nr.encodeWAV=Yf;function Jf(v,O,W){for(let H=0;H<W.length;H++,O+=4)v.setFloat32(O,W[H],!0)}function eh(v,O,W){for(let H=0;H<W.length;H++,O+=2){const N=Math.max(-1,Math.min(1,W[H]));v.setInt16(O,N<0?N*32768:N*32767,!0)}}function Wa(v,O,W){for(let H=0;H<W.length;H++)v.setUint8(O+H,W.charCodeAt(H))}async function th(v){const O=new OfflineAudioContext(1,1,44100),W=new FileReader;let H=null;if(await new Promise(ie=>{W.addEventListener("loadend",()=>{const ne=W.result;O.decodeAudioData(ne,E=>{H=E,O.startRendering().then(()=>{console.log("Rendering completed successfully"),ie()}).catch(se=>{console.error("Rendering failed: ",se)})},E=>{console.log("Error with decoding audio data: ",E)})}),W.readAsArrayBuffer(v)}),H===null)throw Error("some shit");const N=H,Z=new Float32Array(N.length);for(let ie=0;ie<N.length;ie++)for(let ne=0;ne<N.numberOfChannels;ne++){const E=N.getChannelData(ne)[ie],se=Z[ie];if(E===void 0||se===void 0)throw new Error("sample or out[i] is undefined");Z[ie]=se+E}return{audio:Z,sampleRate:N.sampleRate}}nr.audioFileToArray=th;var vc={},xc={exports:{}};/*!
 * ONNX Runtime Web v1.22.0
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */(function(v,O){var W=(()=>{var H=Object.defineProperty,N=Object.getOwnPropertyDescriptor,Z=Object.getOwnPropertyNames,ie=Object.prototype.hasOwnProperty,ne=(c=>typeof Nt<"u"?Nt:typeof Proxy<"u"?new Proxy(c,{get:(g,b)=>(typeof Nt<"u"?Nt:g)[b]}):c)(function(c){if(typeof Nt<"u")return Nt.apply(this,arguments);throw Error('Dynamic require of "'+c+'" is not supported')}),E=(c,g)=>()=>(c&&(g=c(c=0)),g),se=(c,g)=>{for(var b in g)H(c,b,{get:g[b],enumerable:!0})},Me=(c,g,b,I)=>{if(g&&typeof g=="object"||typeof g=="function")for(let S of Z(g))!ie.call(c,S)&&S!==b&&H(c,S,{get:()=>g[S],enumerable:!(I=N(g,S))||I.enumerable});return c},be=c=>Me(H({},"__esModule",{value:!0}),c),le,ve,ye,Ae,Ue,Fe=E(()=>{le=new Map,ve=[],ye=(c,g,b)=>{if(g&&typeof g.init=="function"&&typeof g.createInferenceSessionHandler=="function"){let I=le.get(c);if(I===void 0)le.set(c,{backend:g,priority:b});else{if(I.priority>b)return;if(I.priority===b&&I.backend!==g)throw new Error(`cannot register backend "${c}" using priority ${b}`)}if(b>=0){let S=ve.indexOf(c);S!==-1&&ve.splice(S,1);for(let R=0;R<ve.length;R++)if(le.get(ve[R]).priority<=b){ve.splice(R,0,c);return}ve.push(c)}return}throw new TypeError("not a valid backend")},Ae=async c=>{let g=le.get(c);if(!g)return"backend not found.";if(g.initialized)return g.backend;if(g.aborted)return g.error;{let b=!!g.initPromise;try{return b||(g.initPromise=g.backend.init(c)),await g.initPromise,g.initialized=!0,g.backend}catch(I){return b||(g.error=`${I}`,g.aborted=!0),g.error}finally{delete g.initPromise}}},Ue=async c=>{let g=c.executionProviders||[],b=g.map(M=>typeof M=="string"?M:M.name),I=b.length===0?ve:b,S,R=[],C=new Set;for(let M of I){let F=await Ae(M);typeof F=="string"?R.push({name:M,err:F}):(S||(S=F),S===F&&C.add(M))}if(!S)throw new Error(`no available backend found. ERR: ${R.map(M=>`[${M.name}] ${M.err}`).join(", ")}`);for(let{name:M,err:F}of R)b.includes(M)&&console.warn(`removing requested execution provider "${M}" from session options because it is not available: ${F}`);let k=g.filter(M=>C.has(typeof M=="string"?M:M.name));return[S,new Proxy(c,{get:(M,F)=>F==="executionProviders"?k:Reflect.get(M,F)})]}}),Ce=E(()=>{Fe()}),J,ce=E(()=>{J="1.22.0"}),ae,V,re=E(()=>{ce(),ae="warning",V={wasm:{},webgl:{},webgpu:{},versions:{common:J},set logLevel(c){if(c!==void 0){if(typeof c!="string"||["verbose","info","warning","error","fatal"].indexOf(c)===-1)throw new Error(`Unsupported logging level: ${c}`);ae=c}},get logLevel(){return ae}},Object.defineProperty(V,"logLevel",{enumerable:!0})}),Q,De=E(()=>{re(),Q=V}),Ie,Ne,ot=E(()=>{Ie=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);b.width=c.dims[3],b.height=c.dims[2];let I=b.getContext("2d");if(I!=null){let S,R;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(S=c.dims[2],R=c.dims[3]):(S=c.dims[3],R=c.dims[2]);let C=(g==null?void 0:g.format)!==void 0?g.format:"RGB",k=g==null?void 0:g.norm,M,F;k===void 0||k.mean===void 0?M=[255,255,255,255]:typeof k.mean=="number"?M=[k.mean,k.mean,k.mean,k.mean]:(M=[k.mean[0],k.mean[1],k.mean[2],0],k.mean[3]!==void 0&&(M[3]=k.mean[3])),k===void 0||k.bias===void 0?F=[0,0,0,0]:typeof k.bias=="number"?F=[k.bias,k.bias,k.bias,k.bias]:(F=[k.bias[0],k.bias[1],k.bias[2],0],k.bias[3]!==void 0&&(F[3]=k.bias[3]));let j=R*S,K=0,P=j,oe=j*2,A=-1;C==="RGBA"?(K=0,P=j,oe=j*2,A=j*3):C==="RGB"?(K=0,P=j,oe=j*2):C==="RBG"&&(K=0,oe=j,P=j*2);for(let X=0;X<R;X++)for(let Je=0;Je<S;Je++){let Ee=(c.data[K++]-F[0])*M[0],Te=(c.data[P++]-F[1])*M[1],Ze=(c.data[oe++]-F[2])*M[2],de=A===-1?255:(c.data[A++]-F[3])*M[3];I.fillStyle="rgba("+Ee+","+Te+","+Ze+","+de+")",I.fillRect(Je,X,1,1)}if("toDataURL"in b)return b.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},Ne=(c,g)=>{let b=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),I;if(b!=null){let S,R,C;(g==null?void 0:g.tensorLayout)!==void 0&&g.tensorLayout==="NHWC"?(S=c.dims[2],R=c.dims[1],C=c.dims[3]):(S=c.dims[3],R=c.dims[2],C=c.dims[1]);let k=g!==void 0&&g.format!==void 0?g.format:"RGB",M=g==null?void 0:g.norm,F,j;M===void 0||M.mean===void 0?F=[255,255,255,255]:typeof M.mean=="number"?F=[M.mean,M.mean,M.mean,M.mean]:(F=[M.mean[0],M.mean[1],M.mean[2],255],M.mean[3]!==void 0&&(F[3]=M.mean[3])),M===void 0||M.bias===void 0?j=[0,0,0,0]:typeof M.bias=="number"?j=[M.bias,M.bias,M.bias,M.bias]:(j=[M.bias[0],M.bias[1],M.bias[2],0],M.bias[3]!==void 0&&(j[3]=M.bias[3]));let K=R*S;if(g!==void 0&&(g.format!==void 0&&C===4&&g.format!=="RGBA"||C===3&&g.format!=="RGB"&&g.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let P=4,oe=0,A=1,X=2,Je=3,Ee=0,Te=K,Ze=K*2,de=-1;k==="RGBA"?(Ee=0,Te=K,Ze=K*2,de=K*3):k==="RGB"?(Ee=0,Te=K,Ze=K*2):k==="RBG"&&(Ee=0,Ze=K,Te=K*2),I=b.createImageData(S,R);for(let Xe=0;Xe<R*S;oe+=P,A+=P,X+=P,Je+=P,Xe++)I.data[oe]=(c.data[Ee++]-j[0])*F[0],I.data[A]=(c.data[Te++]-j[1])*F[1],I.data[X]=(c.data[Ze++]-j[2])*F[2],I.data[Je]=de===-1?255:(c.data[de++]-j[3])*F[3]}else throw new Error("Can not access image data");return I}}),We,Ke,Ot,Rt,je,ft,or=E(()=>{Be(),We=(c,g)=>{if(c===void 0)throw new Error("Image buffer must be defined");if(g.height===void 0||g.width===void 0)throw new Error("Image height and width must be defined");if(g.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:b,width:I}=g,S=g.norm??{mean:255,bias:0},R,C;typeof S.mean=="number"?R=[S.mean,S.mean,S.mean,S.mean]:R=[S.mean[0],S.mean[1],S.mean[2],S.mean[3]??255],typeof S.bias=="number"?C=[S.bias,S.bias,S.bias,S.bias]:C=[S.bias[0],S.bias[1],S.bias[2],S.bias[3]??0];let k=g.format!==void 0?g.format:"RGBA",M=g.tensorFormat!==void 0&&g.tensorFormat!==void 0?g.tensorFormat:"RGB",F=b*I,j=M==="RGBA"?new Float32Array(F*4):new Float32Array(F*3),K=4,P=0,oe=1,A=2,X=3,Je=0,Ee=F,Te=F*2,Ze=-1;k==="RGB"&&(K=3,P=0,oe=1,A=2,X=-1),M==="RGBA"?Ze=F*3:M==="RBG"?(Je=0,Te=F,Ee=F*2):M==="BGR"&&(Te=0,Ee=F,Je=F*2);for(let de=0;de<F;de++,P+=K,A+=K,oe+=K,X+=K)j[Je++]=(c[P]+C[0])/R[0],j[Ee++]=(c[oe]+C[1])/R[1],j[Te++]=(c[A]+C[2])/R[2],Ze!==-1&&X!==-1&&(j[Ze++]=(c[X]+C[3])/R[3]);return M==="RGBA"?new He("float32",j,[1,4,b,I]):new He("float32",j,[1,3,b,I])},Ke=async(c,g)=>{let b=typeof HTMLImageElement<"u"&&c instanceof HTMLImageElement,I=typeof ImageData<"u"&&c instanceof ImageData,S=typeof ImageBitmap<"u"&&c instanceof ImageBitmap,R=typeof c=="string",C,k=g??{},M=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},F=j=>typeof HTMLCanvasElement<"u"&&j instanceof HTMLCanvasElement||j instanceof OffscreenCanvas?j.getContext("2d"):null;if(b){let j=M();j.width=c.width,j.height=c.height;let K=F(j);if(K!=null){let P=c.height,oe=c.width;if(g!==void 0&&g.resizedHeight!==void 0&&g.resizedWidth!==void 0&&(P=g.resizedHeight,oe=g.resizedWidth),g!==void 0){if(k=g,g.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");k.tensorFormat="RGBA",k.height=P,k.width=oe}else k.tensorFormat="RGBA",k.height=P,k.width=oe;K.drawImage(c,0,0),C=K.getImageData(0,0,oe,P).data}else throw new Error("Can not access image data")}else if(I){let j,K;if(g!==void 0&&g.resizedWidth!==void 0&&g.resizedHeight!==void 0?(j=g.resizedHeight,K=g.resizedWidth):(j=c.height,K=c.width),g!==void 0&&(k=g),k.format="RGBA",k.height=j,k.width=K,g!==void 0){let P=M();P.width=K,P.height=j;let oe=F(P);if(oe!=null)oe.putImageData(c,0,0),C=oe.getImageData(0,0,K,j).data;else throw new Error("Can not access image data")}else C=c.data}else if(S){if(g===void 0)throw new Error("Please provide image config with format for Imagebitmap");let j=M();j.width=c.width,j.height=c.height;let K=F(j);if(K!=null){let P=c.height,oe=c.width;return K.drawImage(c,0,0,oe,P),C=K.getImageData(0,0,oe,P).data,k.height=P,k.width=oe,We(C,k)}else throw new Error("Can not access image data")}else{if(R)return new Promise((j,K)=>{let P=M(),oe=F(P);if(!c||!oe)return K();let A=new Image;A.crossOrigin="Anonymous",A.src=c,A.onload=()=>{P.width=A.width,P.height=A.height,oe.drawImage(A,0,0,P.width,P.height);let X=oe.getImageData(0,0,P.width,P.height);k.height=P.height,k.width=P.width,j(We(X.data,k))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(C!==void 0)return We(C,k);throw new Error("Input data provided is not supported - aborted tensor creation")},Ot=(c,g)=>{let{width:b,height:I,download:S,dispose:R}=g,C=[1,I,b,4];return new He({location:"texture",type:"float32",texture:c,dims:C,download:S,dispose:R})},Rt=(c,g)=>{let{dataType:b,dims:I,download:S,dispose:R}=g;return new He({location:"gpu-buffer",type:b??"float32",gpuBuffer:c,dims:I,download:S,dispose:R})},je=(c,g)=>{let{dataType:b,dims:I,download:S,dispose:R}=g;return new He({location:"ml-tensor",type:b??"float32",mlTensor:c,dims:I,download:S,dispose:R})},ft=(c,g,b)=>new He({location:"cpu-pinned",type:c,data:g,dims:b??[g.length]})}),it,Y,Ye,xt,Lt=E(()=>{it=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Y=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),Ye=!1,xt=()=>{if(!Ye){Ye=!0;let c=typeof BigInt64Array<"u"&&BigInt64Array.from,g=typeof BigUint64Array<"u"&&BigUint64Array.from,b=globalThis.Float16Array,I=typeof b<"u"&&b.from;c&&(it.set("int64",BigInt64Array),Y.set(BigInt64Array,"int64")),g&&(it.set("uint64",BigUint64Array),Y.set(BigUint64Array,"uint64")),I?(it.set("float16",b),Y.set(b,"float16")):it.set("float16",Uint16Array)}}}),Tr,Er,di=E(()=>{Be(),Tr=c=>{let g=1;for(let b=0;b<c.length;b++){let I=c[b];if(typeof I!="number"||!Number.isSafeInteger(I))throw new TypeError(`dims[${b}] must be an integer, got: ${I}`);if(I<0)throw new RangeError(`dims[${b}] must be a non-negative integer, got: ${I}`);g*=I}return g},Er=(c,g)=>{switch(c.location){case"cpu":return new He(c.type,c.data,g);case"cpu-pinned":return new He({location:"cpu-pinned",data:c.data,type:c.type,dims:g});case"texture":return new He({location:"texture",texture:c.texture,type:c.type,dims:g});case"gpu-buffer":return new He({location:"gpu-buffer",gpuBuffer:c.gpuBuffer,type:c.type,dims:g});case"ml-tensor":return new He({location:"ml-tensor",mlTensor:c.mlTensor,type:c.type,dims:g});default:throw new Error(`tensorReshape: tensor location ${c.location} is not supported`)}}}),He,Be=E(()=>{ot(),or(),Lt(),di(),He=class{constructor(c,g,b){xt();let I,S;if(typeof c=="object"&&"location"in c)switch(this.dataLocation=c.location,I=c.type,S=c.dims,c.location){case"cpu-pinned":{let C=it.get(I);if(!C)throw new TypeError(`unsupported type "${I}" to create tensor from pinned buffer`);if(!(c.data instanceof C))throw new TypeError(`buffer should be of type ${C.name}`);this.cpuData=c.data;break}case"texture":{if(I!=="float32")throw new TypeError(`unsupported type "${I}" to create tensor from texture`);this.gpuTextureData=c.texture,this.downloader=c.download,this.disposer=c.dispose;break}case"gpu-buffer":{if(I!=="float32"&&I!=="float16"&&I!=="int32"&&I!=="int64"&&I!=="uint32"&&I!=="uint8"&&I!=="bool"&&I!=="uint4"&&I!=="int4")throw new TypeError(`unsupported type "${I}" to create tensor from gpu buffer`);this.gpuBufferData=c.gpuBuffer,this.downloader=c.download,this.disposer=c.dispose;break}case"ml-tensor":{if(I!=="float32"&&I!=="float16"&&I!=="int32"&&I!=="int64"&&I!=="uint32"&&I!=="uint64"&&I!=="int8"&&I!=="uint8"&&I!=="bool"&&I!=="uint4"&&I!=="int4")throw new TypeError(`unsupported type "${I}" to create tensor from MLTensor`);this.mlTensorData=c.mlTensor,this.downloader=c.download,this.disposer=c.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let C,k;if(typeof c=="string")if(I=c,k=b,c==="string"){if(!Array.isArray(g))throw new TypeError("A string tensor's data must be a string array.");C=g}else{let M=it.get(c);if(M===void 0)throw new TypeError(`Unsupported tensor type: ${c}.`);if(Array.isArray(g)){if(c==="float16"&&M===Uint16Array||c==="uint4"||c==="int4")throw new TypeError(`Creating a ${c} tensor from number array is not supported. Please use ${M.name} as data.`);c==="uint64"||c==="int64"?C=M.from(g,BigInt):C=M.from(g)}else if(g instanceof M)C=g;else if(g instanceof Uint8ClampedArray)if(c==="uint8")C=Uint8Array.from(g);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(c==="float16"&&g instanceof Uint16Array&&M!==Uint16Array)C=new globalThis.Float16Array(g.buffer,g.byteOffset,g.length);else throw new TypeError(`A ${I} tensor's data must be type of ${M}`)}else if(k=g,Array.isArray(c)){if(c.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let M=typeof c[0];if(M==="string")I="string",C=c;else if(M==="boolean")I="bool",C=Uint8Array.from(c);else throw new TypeError(`Invalid element type of data array: ${M}.`)}else if(c instanceof Uint8ClampedArray)I="uint8",C=Uint8Array.from(c);else{let M=Y.get(c.constructor);if(M===void 0)throw new TypeError(`Unsupported type for tensor data: ${c.constructor}.`);I=M,C=c}if(k===void 0)k=[C.length];else if(!Array.isArray(k))throw new TypeError("A tensor's dims must be a number array");S=k,this.cpuData=C,this.dataLocation="cpu"}let R=Tr(S);if(this.cpuData&&R!==this.cpuData.length&&!((I==="uint4"||I==="int4")&&Math.ceil(R/2)===this.cpuData.length))throw new Error(`Tensor's size(${R}) does not match data length(${this.cpuData.length}).`);this.type=I,this.dims=S,this.size=R}static async fromImage(c,g){return Ke(c,g)}static fromTexture(c,g){return Ot(c,g)}static fromGpuBuffer(c,g){return Rt(c,g)}static fromMLTensor(c,g){return je(c,g)}static fromPinnedBuffer(c,g,b){return ft(c,g,b)}toDataURL(c){return Ie(this,c)}toImageData(c){return Ne(this,c)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(c){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let g=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=g,c&&this.disposer&&(this.disposer(),this.disposer=void 0),g}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(c){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Er(this,c)}}}),Le,Mt=E(()=>{Be(),Le=He}),dt,Ir,pt,ut,Ai=E(()=>{re(),dt=(c,g)=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||console.timeStamp(`${c}::ORT::${g}`)},Ir=(c,g)=>{var S;let b=((S=new Error().stack)==null?void 0:S.split(/\r\n|\r|\n/g))||[],I=!1;for(let R=0;R<b.length;R++){if(I&&!b[R].includes("TRACE_FUNC")){let C=`FUNC_${c}::${b[R].trim().split(" ")[1]}`;g&&(C+=`::${g}`),dt("CPU",C);return}b[R].includes("TRACE_FUNC")&&(I=!0)}},pt=c=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||Ir("BEGIN",c)},ut=c=>{(typeof V.trace>"u"?!V.wasm.trace:!V.trace)||Ir("END",c)}}),Oi,Za=E(()=>{Fe(),Mt(),Ai(),Oi=class Sc{constructor(g){this.handler=g}async run(g,b,I){pt();let S={},R={};if(typeof g!="object"||g===null||g instanceof Le||Array.isArray(g))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let C=!0;if(typeof b=="object"){if(b===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(b instanceof Le)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(b)){if(b.length===0)throw new TypeError("'fetches' cannot be an empty array.");C=!1;for(let F of b){if(typeof F!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(F)===-1)throw new RangeError(`'fetches' contains invalid output name: ${F}.`);S[F]=null}if(typeof I=="object"&&I!==null)R=I;else if(typeof I<"u")throw new TypeError("'options' must be an object.")}else{let F=!1,j=Object.getOwnPropertyNames(b);for(let K of this.outputNames)if(j.indexOf(K)!==-1){let P=b[K];(P===null||P instanceof Le)&&(F=!0,C=!1,S[K]=P)}if(F){if(typeof I=="object"&&I!==null)R=I;else if(typeof I<"u")throw new TypeError("'options' must be an object.")}else R=b}}else if(typeof b<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let F of this.inputNames)if(typeof g[F]>"u")throw new Error(`input '${F}' is missing in 'feeds'.`);if(C)for(let F of this.outputNames)S[F]=null;let k=await this.handler.run(g,S,R),M={};for(let F in k)if(Object.hasOwnProperty.call(k,F)){let j=k[F];j instanceof Le?M[F]=j:M[F]=new Le(j.type,j.data,j.dims)}return ut(),M}async release(){return this.handler.dispose()}static async create(g,b,I,S){pt();let R,C={};if(typeof g=="string"){if(R=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof Uint8Array){if(R=g,typeof b=="object"&&b!==null)C=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(g instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&g instanceof SharedArrayBuffer){let j=g,K=0,P=g.byteLength;if(typeof b=="object"&&b!==null)C=b;else if(typeof b=="number"){if(K=b,!Number.isSafeInteger(K))throw new RangeError("'byteOffset' must be an integer.");if(K<0||K>=j.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${j.byteLength}).`);if(P=g.byteLength-K,typeof I=="number"){if(P=I,!Number.isSafeInteger(P))throw new RangeError("'byteLength' must be an integer.");if(P<=0||K+P>j.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${j.byteLength-K}].`);if(typeof S=="object"&&S!==null)C=S;else if(typeof S<"u")throw new TypeError("'options' must be an object.")}else if(typeof I<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof b<"u")throw new TypeError("'options' must be an object.");R=new Uint8Array(j,K,P)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[k,M]=await Ue(C),F=await k.createInferenceSessionHandler(R,M);return ut(),new Sc(F)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),kr,Qa=E(()=>{Za(),kr=Oi}),Xa=E(()=>{}),Ya=E(()=>{}),Ja=E(()=>{}),en=E(()=>{}),Ri={};se(Ri,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>Le,env:()=>Q,registerBackend:()=>ye});var ht=E(()=>{Ce(),De(),Qa(),Mt(),Xa(),Ya(),Ai(),Ja(),en()}),Cr=E(()=>{}),Mi={};se(Mi,{default:()=>Bi});var zr,Ar,Bi,tn=E(()=>{var c;ea(),Et(),Dr(),zr="ort-wasm-proxy-worker",Ar=((c=globalThis.self)==null?void 0:c.name)===zr,Ar&&(self.onmessage=g=>{let{type:b,in:I}=g.data;try{switch(b){case"init-wasm":Nr(I.wasm).then(()=>{ci(I).then(()=>{postMessage({type:b})},S=>{postMessage({type:b,err:S})})},S=>{postMessage({type:b,err:S})});break;case"init-ep":{let{epName:S,env:R}=I;fi(R,S).then(()=>{postMessage({type:b})},C=>{postMessage({type:b,err:C})});break}case"copy-from":{let{buffer:S}=I,R=Re(S);postMessage({type:b,out:R});break}case"create":{let{model:S,options:R}=I;Bt(S,R).then(C=>{postMessage({type:b,out:C})},C=>{postMessage({type:b,err:C})});break}case"release":gi(I),postMessage({type:b});break;case"run":{let{sessionId:S,inputIndices:R,inputs:C,outputIndices:k,options:M}=I;U(S,R,C,k,new Array(k.length).fill(null),M).then(F=>{F.some(j=>j[3]!=="cpu")?postMessage({type:b,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:b,out:F},yi([...C,...F]))},F=>{postMessage({type:b,err:F})});break}case"end-profiling":hr(I),postMessage({type:b});break;default:}}catch(S){postMessage({type:b,err:S})}}),Bi=Ar?null:g=>new Worker(g??Qe,{type:"classic",name:zr})}),Di,Pi,Qe,Or,ur,Ui,Ni,Rr,Li,Mr,Vi,Br,qi,Dr=E(()=>{Cr(),Di=typeof location>"u"?void 0:location.origin,Pi=()=>{var c,g;return typeof document<"u"?(c=document.currentScript)==null?void 0:c.src:typeof self<"u"?(g=self.location)==null?void 0:g.href:void 0},Qe=Pi(),Or=()=>{if(Qe&&!Qe.startsWith("blob:"))return Qe.substring(0,Qe.lastIndexOf("/")+1)},ur=(c,g)=>{try{let b=g??Qe;return(b?new URL(c,b):new URL(c)).origin===Di}catch{return!1}},Ui=(c,g)=>{let b=g??Qe;try{return(b?new URL(c,b):new URL(c)).href}catch{return}},Ni=(c,g)=>`${g??"./"}${c}`,Rr=async c=>{let g=await(await fetch(c,{credentials:"same-origin"})).blob();return URL.createObjectURL(g)},Li=async c=>(await import(c)).default,Mr=(tn(),be(Mi)).default,Vi=async()=>{if(!Qe)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(ur(Qe))return[void 0,Mr()];let c=await Rr(Qe);return[c,Mr(c)]},Br=void 0,qi=async(c,g,b)=>{if(!c&&!g&&Br&&Qe&&ur(Qe))return[void 0,Br];{let I="ort-wasm-simd-threaded.mjs",S=c??Ui(I,g),R=b&&S&&!ur(S,g),C=R?await Rr(S):S??Ni(I,g);return[R?C:void 0,await Li(C)]}}}),Pr,lr,Vt,Ur,Fi,Wi,Gi,Nr,xe,Et=E(()=>{Dr(),lr=!1,Vt=!1,Ur=!1,Fi=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Wi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Gi=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Nr=async c=>{if(lr)return Promise.resolve();if(Vt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ur)throw new Error("previous call to 'initializeWebAssembly()' failed.");Vt=!0;let g=c.initTimeout,b=c.numThreads;if(c.simd!==!1){if(c.simd==="relaxed"){if(!Gi())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Wi())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let I=Fi();b>1&&!I&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+b+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),c.numThreads=b=1);let S=c.wasmPaths,R=typeof S=="string"?S:void 0,C=S==null?void 0:S.mjs,k=(C==null?void 0:C.href)??C,M=S==null?void 0:S.wasm,F=(M==null?void 0:M.href)??M,j=c.wasmBinary,[K,P]=await qi(k,R,b>1),oe=!1,A=[];if(g>0&&A.push(new Promise(X=>{setTimeout(()=>{oe=!0,X()},g)})),A.push(new Promise((X,Je)=>{let Ee={numThreads:b};if(j)Ee.wasmBinary=j;else if(F||R)Ee.locateFile=Te=>F??R+Te;else if(k&&k.indexOf("blob:")!==0)Ee.locateFile=Te=>new URL(Te,k).href;else if(K){let Te=Or();Te&&(Ee.locateFile=Ze=>Te+Ze)}P(Ee).then(Te=>{Vt=!1,lr=!0,Pr=Te,X(),K&&URL.revokeObjectURL(K)},Te=>{Vt=!1,Ur=!0,Je(Te)})})),await Promise.race(A),oe)throw new Error(`WebAssembly backend initializing failed due to timeout: ${g}ms`)},xe=()=>{if(lr&&Pr)return Pr;throw new Error("WebAssembly is not initialized yet.")}}),tt,dr,_e,Lr=E(()=>{Et(),tt=(c,g)=>{let b=xe(),I=b.lengthBytesUTF8(c)+1,S=b._malloc(I);return b.stringToUTF8(c,S,I),g.push(S),S},dr=(c,g,b,I)=>{if(typeof c=="object"&&c!==null){if(b.has(c))throw new Error("Circular reference in options");b.add(c)}Object.entries(c).forEach(([S,R])=>{let C=g?g+S:S;if(typeof R=="object")dr(R,C+".",b,I);else if(typeof R=="string"||typeof R=="number")I(C,R.toString());else if(typeof R=="boolean")I(C,R?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof R}`)})},_e=c=>{let g=xe(),b=g.stackSave();try{let I=g.PTR_SIZE,S=g.stackAlloc(2*I);g._OrtGetLastError(S,S+I);let R=Number(g.getValue(S,I===4?"i32":"i64")),C=g.getValue(S+I,"*"),k=C?g.UTF8ToString(C):"";throw new Error(`${c} ERROR_CODE: ${R}, ERROR_MESSAGE: ${k}`)}finally{g.stackRestore(b)}}}),ji,rn=E(()=>{Et(),Lr(),ji=c=>{let g=xe(),b=0,I=[],S=c||{};try{if((c==null?void 0:c.logSeverityLevel)===void 0)S.logSeverityLevel=2;else if(typeof c.logSeverityLevel!="number"||!Number.isInteger(c.logSeverityLevel)||c.logSeverityLevel<0||c.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${c.logSeverityLevel}`);if((c==null?void 0:c.logVerbosityLevel)===void 0)S.logVerbosityLevel=0;else if(typeof c.logVerbosityLevel!="number"||!Number.isInteger(c.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${c.logVerbosityLevel}`);(c==null?void 0:c.terminate)===void 0&&(S.terminate=!1);let R=0;return(c==null?void 0:c.tag)!==void 0&&(R=tt(c.tag,I)),b=g._OrtCreateRunOptions(S.logSeverityLevel,S.logVerbosityLevel,!!S.terminate,R),b===0&&_e("Can't create run options."),(c==null?void 0:c.extra)!==void 0&&dr(c.extra,"",new WeakSet,(C,k)=>{let M=tt(C,I),F=tt(k,I);g._OrtAddRunConfigEntry(b,M,F)!==0&&_e(`Can't set a run config entry: ${C} - ${k}.`)}),[b,I]}catch(R){throw b!==0&&g._OrtReleaseRunOptions(b),I.forEach(C=>g._free(C)),R}}}),Hi,Ki,Zi,qt,Qi,Xi,an=E(()=>{Et(),Lr(),Hi=c=>{switch(c){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${c}`)}},Ki=c=>{switch(c){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${c}`)}},Zi=c=>{c.extra||(c.extra={}),c.extra.session||(c.extra.session={});let g=c.extra.session;g.use_ort_model_bytes_directly||(g.use_ort_model_bytes_directly="1"),c.executionProviders&&c.executionProviders.some(b=>(typeof b=="string"?b:b.name)==="webgpu")&&(c.enableMemPattern=!1)},qt=(c,g,b,I)=>{let S=tt(g,I),R=tt(b,I);xe()._OrtAddSessionConfigEntry(c,S,R)!==0&&_e(`Can't set a session config entry: ${g} - ${b}.`)},Qi=async(c,g,b)=>{for(let I of g){let S=typeof I=="string"?I:I.name,R=[];switch(S){case"webnn":if(S="WEBNN",typeof I!="string"){let j=I==null?void 0:I.deviceType;j&&qt(c,"deviceType",j,b)}break;case"webgpu":if(S="JS",typeof I!="string"){let j=I;if(j!=null&&j.preferredLayout){if(j.preferredLayout!=="NCHW"&&j.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${j.preferredLayout}`);qt(c,"preferredLayout",j.preferredLayout,b)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${S}`)}let C=tt(S,b),k=R.length,M=0,F=0;if(k>0){M=xe()._malloc(k*xe().PTR_SIZE),b.push(M),F=xe()._malloc(k*xe().PTR_SIZE),b.push(F);for(let j=0;j<k;j++)xe().setValue(M+j*xe().PTR_SIZE,R[j][0],"*"),xe().setValue(F+j*xe().PTR_SIZE,R[j][1],"*")}await xe()._OrtAppendExecutionProvider(c,C,M,F,k)!==0&&_e(`Can't append execution provider: ${S}.`)}},Xi=async c=>{let g=xe(),b=0,I=[],S=c||{};Zi(S);try{let R=Hi(S.graphOptimizationLevel??"all"),C=Ki(S.executionMode??"sequential"),k=typeof S.logId=="string"?tt(S.logId,I):0,M=S.logSeverityLevel??2;if(!Number.isInteger(M)||M<0||M>4)throw new Error(`log serverity level is not valid: ${M}`);let F=S.logVerbosityLevel??0;if(!Number.isInteger(F)||F<0||F>4)throw new Error(`log verbosity level is not valid: ${F}`);let j=typeof S.optimizedModelFilePath=="string"?tt(S.optimizedModelFilePath,I):0;if(b=g._OrtCreateSessionOptions(R,!!S.enableCpuMemArena,!!S.enableMemPattern,C,!!S.enableProfiling,0,k,M,F,j),b===0&&_e("Can't create session options."),S.executionProviders&&await Qi(b,S.executionProviders,I),S.enableGraphCapture!==void 0){if(typeof S.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${S.enableGraphCapture}`);qt(b,"enableGraphCapture",S.enableGraphCapture.toString(),I)}if(S.freeDimensionOverrides)for(let[K,P]of Object.entries(S.freeDimensionOverrides)){if(typeof K!="string")throw new Error(`free dimension override name must be a string: ${K}`);if(typeof P!="number"||!Number.isInteger(P)||P<0)throw new Error(`free dimension override value must be a non-negative integer: ${P}`);let oe=tt(K,I);g._OrtAddFreeDimensionOverride(b,oe,P)!==0&&_e(`Can't set a free dimension override: ${K} - ${P}.`)}return S.extra!==void 0&&dr(S.extra,"",new WeakSet,(K,P)=>{qt(b,K,P,I)}),[b,I]}catch(R){throw b!==0&&g._OrtReleaseSessionOptions(b)!==0&&_e("Can't release session options."),I.forEach(C=>g._free(C)),R}}}),It,kt,Ct,Vr,qr,Fr,Wr,pi,$e=E(()=>{It=c=>{switch(c){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${c}`)}},kt=c=>{switch(c){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${c}`)}},Ct=(c,g)=>{let b=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][c],I=typeof g=="number"?g:g.reduce((S,R)=>S*R,1);return b>0?Math.ceil(I*b):void 0},Vr=c=>{switch(c){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${c}`)}},qr=c=>{switch(c){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${c}`)}},Fr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",Wr=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint64"||c==="int8"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",pi=c=>{switch(c){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${c}`)}}}),Gr,Yi=E(()=>{Cr(),Gr=async c=>{if(typeof c=="string"){let g=await fetch(c);if(!g.ok)throw new Error(`failed to load external data file: ${c}`);let b=g.headers.get("Content-Length"),I=b?parseInt(b,10):0;if(I<1073741824)return new Uint8Array(await g.arrayBuffer());{if(!g.body)throw new Error(`failed to load external data file: ${c}, no response body.`);let S=g.body.getReader(),R;try{R=new ArrayBuffer(I)}catch(k){if(k instanceof RangeError){let M=Math.ceil(I/65536);R=new WebAssembly.Memory({initial:M,maximum:M}).buffer}else throw k}let C=0;for(;;){let{done:k,value:M}=await S.read();if(k)break;let F=M.byteLength;new Uint8Array(R,C,F).set(M),C+=F}return new Uint8Array(R,0,I)}}else return c instanceof Blob?new Uint8Array(await c.arrayBuffer()):c instanceof Uint8Array?c:new Uint8Array(c)}}),Ji,ci,fi,Jt,hi,mi,Re,Bt,gi,er,U,hr,yi,ea=E(()=>{rn(),an(),$e(),Et(),Lr(),Yi(),Ji=(c,g)=>{xe()._OrtInit(c,g)!==0&&_e("Can't initialize onnxruntime.")},ci=async c=>{Ji(c.wasm.numThreads,qr(c.logLevel))},fi=async(c,g)=>{var b,I;(I=(b=xe()).asyncInit)==null||I.call(b)},Jt=new Map,hi=c=>{let g=xe(),b=g.stackSave();try{let I=g.PTR_SIZE,S=g.stackAlloc(2*I);g._OrtGetInputOutputCount(c,S,S+I)!==0&&_e("Can't get session input/output count.");let R=I===4?"i32":"i64";return[Number(g.getValue(S,R)),Number(g.getValue(S+I,R))]}finally{g.stackRestore(b)}},mi=(c,g)=>{let b=xe(),I=b.stackSave(),S=0;try{let R=b.PTR_SIZE,C=b.stackAlloc(2*R);b._OrtGetInputOutputMetadata(c,g,C,C+R)!==0&&_e("Can't get session input/output metadata.");let k=Number(b.getValue(C,"*"));S=Number(b.getValue(C+R,"*"));let M=b.HEAP32[S/4];if(M===0)return[k,0];let F=b.HEAPU32[S/4+1],j=[];for(let K=0;K<F;K++){let P=Number(b.getValue(S+8+K*R,"*"));j.push(P!==0?b.UTF8ToString(P):Number(b.getValue(S+8+(K+F)*R,"*")))}return[k,M,j]}finally{b.stackRestore(I),S!==0&&b._OrtFree(S)}},Re=c=>{let g=xe(),b=g._malloc(c.byteLength);if(b===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${c.byteLength}.`);return g.HEAPU8.set(c,b),[b,c.byteLength]},Bt=async(c,g)=>{var j,K,P;let b,I,S=xe();Array.isArray(c)?[b,I]=c:c.buffer===S.HEAPU8.buffer?[b,I]=[c.byteOffset,c.byteLength]:[b,I]=Re(c);let R=0,C=0,k=[],M=[],F=[];try{if([C,k]=await Xi(g),(g==null?void 0:g.externalData)&&S.mountExternalData){let Xe=[];for(let Ve of g.externalData){let ct=typeof Ve=="string"?Ve:Ve.path;Xe.push(Gr(typeof Ve=="string"?Ve:Ve.data).then(mt=>{S.mountExternalData(ct,mt)}))}await Promise.all(Xe)}for(let Xe of(g==null?void 0:g.executionProviders)??[])if((typeof Xe=="string"?Xe:Xe.name)==="webnn"){if(S.shouldTransferToMLTensor=!1,typeof Xe!="string"){let Ve=Xe,ct=Ve==null?void 0:Ve.context,mt=Ve==null?void 0:Ve.gpuDevice,St=Ve==null?void 0:Ve.deviceType,Zr=Ve==null?void 0:Ve.powerPreference;ct?S.currentContext=ct:mt?S.currentContext=await S.webnnCreateMLContext(mt):S.currentContext=await S.webnnCreateMLContext({deviceType:St,powerPreference:Zr})}else S.currentContext=await S.webnnCreateMLContext();break}R=await S._OrtCreateSession(b,I,C),(j=S.webgpuOnCreateSession)==null||j.call(S,R),R===0&&_e("Can't create a session."),(K=S.jsepOnCreateSession)==null||K.call(S),S.currentContext&&(S.webnnRegisterMLContext(R,S.currentContext),S.currentContext=void 0,S.shouldTransferToMLTensor=!0);let[oe,A]=hi(R),X=!!(g!=null&&g.enableGraphCapture),Je=[],Ee=[],Te=[],Ze=[],de=[];for(let Xe=0;Xe<oe;Xe++){let[Ve,ct,mt]=mi(R,Xe);Ve===0&&_e("Can't get an input name."),M.push(Ve);let St=S.UTF8ToString(Ve);Je.push(St),Te.push(ct===0?{name:St,isTensor:!1}:{name:St,isTensor:!0,type:kt(ct),shape:mt})}for(let Xe=0;Xe<A;Xe++){let[Ve,ct,mt]=mi(R,Xe+oe);Ve===0&&_e("Can't get an output name."),F.push(Ve);let St=S.UTF8ToString(Ve);Ee.push(St),Ze.push(ct===0?{name:St,isTensor:!1}:{name:St,isTensor:!0,type:kt(ct),shape:mt})}return Jt.set(R,[R,M,F,null,X,!1]),[R,Je,Ee,Te,Ze]}catch(oe){throw M.forEach(A=>S._OrtFree(A)),F.forEach(A=>S._OrtFree(A)),R!==0&&S._OrtReleaseSession(R)!==0&&_e("Can't release session."),oe}finally{S._free(b),C!==0&&S._OrtReleaseSessionOptions(C)!==0&&_e("Can't release session options."),k.forEach(oe=>S._free(oe)),(P=S.unmountExternalData)==null||P.call(S)}},gi=c=>{var M,F,j;let g=xe(),b=Jt.get(c);if(!b)throw new Error(`cannot release session. invalid session id: ${c}`);let[I,S,R,C,k]=b;C&&(k&&g._OrtClearBoundOutputs(C.handle)!==0&&_e("Can't clear bound outputs."),g._OrtReleaseBinding(C.handle)!==0&&_e("Can't release IO binding.")),(M=g.jsepOnReleaseSession)==null||M.call(g,c),(F=g.webnnOnReleaseSession)==null||F.call(g,c),(j=g.webgpuOnReleaseSession)==null||j.call(g,c),S.forEach(K=>g._OrtFree(K)),R.forEach(K=>g._OrtFree(K)),g._OrtReleaseSession(I)!==0&&_e("Can't release session."),Jt.delete(c)},er=async(c,g,b,I,S,R,C=!1)=>{if(!c){g.push(0);return}let k=xe(),M=k.PTR_SIZE,F=c[0],j=c[1],K=c[3],P=K,oe,A;if(F==="string"&&(K==="gpu-buffer"||K==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(C&&K!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${R} when enableGraphCapture is true.`);if(K==="gpu-buffer"){let Ee=c[2].gpuBuffer;A=Ct(It(F),j);{let Te=k.jsepRegisterBuffer;if(!Te)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');oe=Te(I,R,Ee,A)}}else if(K==="ml-tensor"){let Ee=c[2].mlTensor;A=Ct(It(F),j);let Te=k.webnnRegisterMLTensor;if(!Te)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');oe=Te(I,Ee,It(F),j)}else{let Ee=c[2];if(Array.isArray(Ee)){A=M*Ee.length,oe=k._malloc(A),b.push(oe);for(let Te=0;Te<Ee.length;Te++){if(typeof Ee[Te]!="string")throw new TypeError(`tensor data at index ${Te} is not a string`);k.setValue(oe+Te*M,tt(Ee[Te],b),"*")}}else{let Te=k.webnnIsGraphInput,Ze=k.webnnIsGraphOutput;if(F!=="string"&&Te&&Ze){let de=k.UTF8ToString(S);if(Te(I,de)||Ze(I,de)){let Xe=It(F);A=Ct(Xe,j),P="ml-tensor";let Ve=k.webnnCreateTemporaryTensor,ct=k.webnnUploadTensor;if(!Ve||!ct)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let mt=await Ve(I,Xe,j);ct(mt,new Uint8Array(Ee.buffer,Ee.byteOffset,Ee.byteLength)),oe=mt}else A=Ee.byteLength,oe=k._malloc(A),b.push(oe),k.HEAPU8.set(new Uint8Array(Ee.buffer,Ee.byteOffset,A),oe)}else A=Ee.byteLength,oe=k._malloc(A),b.push(oe),k.HEAPU8.set(new Uint8Array(Ee.buffer,Ee.byteOffset,A),oe)}}let X=k.stackSave(),Je=k.stackAlloc(4*j.length);try{j.forEach((Te,Ze)=>k.setValue(Je+Ze*M,Te,M===4?"i32":"i64"));let Ee=k._OrtCreateTensor(It(F),oe,A,Je,j.length,pi(P));Ee===0&&_e(`Can't create tensor for input/output. session=${I}, index=${R}.`),g.push(Ee)}finally{k.stackRestore(X)}},U=async(c,g,b,I,S,R)=>{var Zr,bt,ua;let C=xe(),k=C.PTR_SIZE,M=Jt.get(c);if(!M)throw new Error(`cannot run inference. invalid session id: ${c}`);let F=M[0],j=M[1],K=M[2],P=M[3],oe=M[4];M[5];let A=g.length,X=I.length,Je=0,Ee=[],Te=[],Ze=[],de=[],Xe=C.stackSave(),Ve=C.stackAlloc(A*k),ct=C.stackAlloc(A*k),mt=C.stackAlloc(X*k),St=C.stackAlloc(X*k);try{[Je,Ee]=ji(R);for(let Pe=0;Pe<A;Pe++)await er(b[Pe],Te,de,c,j[g[Pe]],g[Pe],oe);for(let Pe=0;Pe<X;Pe++)await er(S[Pe],Ze,de,c,K[I[Pe]],A+I[Pe],oe);for(let Pe=0;Pe<A;Pe++)C.setValue(Ve+Pe*k,Te[Pe],"*"),C.setValue(ct+Pe*k,j[g[Pe]],"*");for(let Pe=0;Pe<X;Pe++)C.setValue(mt+Pe*k,Ze[Pe],"*"),C.setValue(St+Pe*k,K[I[Pe]],"*");(Zr=C.jsepOnRunStart)==null||Zr.call(C,F),(bt=C.webnnOnRunStart)==null||bt.call(C,F);let Dt;Dt=await C._OrtRun(F,ct,Ve,A,St,X,mt,Je),Dt!==0&&_e("failed to call OrtRun().");let gt=[],la=[];for(let Pe=0;Pe<X;Pe++){let Gt=Number(C.getValue(mt+Pe*k,"*"));if(Gt===Ze[Pe]){gt.push(S[Pe]);continue}let ka=C.stackSave(),jt=C.stackAlloc(4*k),Qr=!1,at,$t=0;try{C._OrtGetTensorData(Gt,jt,jt+k,jt+2*k,jt+3*k)!==0&&_e(`Can't access output tensor data on index ${Pe}.`);let Ii=k===4?"i32":"i64",Xr=Number(C.getValue(jt,Ii));$t=C.getValue(jt+k,"*");let zt=C.getValue(jt+k*2,"*"),Ca=Number(C.getValue(jt+k*3,Ii)),Ht=[];for(let nt=0;nt<Ca;nt++)Ht.push(Number(C.getValue(zt+nt*k,Ii)));C._OrtFree(zt)!==0&&_e("Can't free memory for tensor dims.");let Kt=Ht.reduce((nt,et)=>nt*et,1);at=kt(Xr);let _r=P==null?void 0:P.outputPreferredLocations[I[Pe]];if(at==="string"){if(_r==="gpu-buffer"||_r==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let nt=[];for(let et=0;et<Kt;et++){let Ut=C.getValue($t+et*k,"*"),za=C.getValue($t+(et+1)*k,"*"),Aa=et===Kt-1?void 0:za-Ut;nt.push(C.UTF8ToString(Ut,Aa))}gt.push([at,Ht,nt,"cpu"])}else if(_r==="gpu-buffer"&&Kt>0){let nt=C.jsepGetBuffer;if(!nt)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let et=nt($t),Ut=Ct(Xr,Kt);if(Ut===void 0||!Fr(at))throw new Error(`Unsupported data type: ${at}`);Qr=!0,gt.push([at,Ht,{gpuBuffer:et,download:C.jsepCreateDownloader(et,Ut,at),dispose:()=>{C._OrtReleaseTensor(Gt)!==0&&_e("Can't release tensor.")}},"gpu-buffer"])}else if(_r==="ml-tensor"&&Kt>0){let nt=C.webnnEnsureTensor,et=C.webnnIsGraphInputOutputTypeSupported;if(!nt||!et)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(Ct(Xr,Kt)===void 0||!Wr(at))throw new Error(`Unsupported data type: ${at}`);if(!et(c,at,!1))throw new Error(`preferredLocation "ml-tensor" for ${at} output is not supported by current WebNN Context.`);let Ut=await nt(c,$t,Xr,Ht,!1);Qr=!0,gt.push([at,Ht,{mlTensor:Ut,download:C.webnnCreateMLTensorDownloader($t,at),dispose:()=>{C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Gt)}},"ml-tensor"])}else if(_r==="ml-tensor-cpu-output"&&Kt>0){let nt=C.webnnCreateMLTensorDownloader($t,at)(),et=gt.length;Qr=!0,la.push((async()=>{let Ut=[et,await nt];return C.webnnReleaseTensorId($t),C._OrtReleaseTensor(Gt),Ut})()),gt.push([at,Ht,[],"cpu"])}else{let nt=Vr(at),et=new nt(Kt);new Uint8Array(et.buffer,et.byteOffset,et.byteLength).set(C.HEAPU8.subarray($t,$t+et.byteLength)),gt.push([at,Ht,et,"cpu"])}}finally{C.stackRestore(ka),at==="string"&&$t&&C._free($t),Qr||C._OrtReleaseTensor(Gt)}}P&&!oe&&(C._OrtClearBoundOutputs(P.handle)!==0&&_e("Can't clear bound outputs."),Jt.set(c,[F,j,K,P,oe,!1]));for(let[Pe,Gt]of await Promise.all(la))gt[Pe][2]=Gt;return gt}finally{(ua=C.webnnOnRunEnd)==null||ua.call(C,F),C.stackRestore(Xe),Te.forEach(Dt=>C._OrtReleaseTensor(Dt)),Ze.forEach(Dt=>C._OrtReleaseTensor(Dt)),de.forEach(Dt=>C._free(Dt)),Je!==0&&C._OrtReleaseRunOptions(Je),Ee.forEach(Dt=>C._free(Dt))}},hr=c=>{let g=xe(),b=Jt.get(c);if(!b)throw new Error("invalid session id");let I=b[0],S=g._OrtEndProfiling(I);S===0&&_e("Can't get an profile file name."),g._OrtFree(S)},yi=c=>{let g=[];for(let b of c){let I=b[2];!Array.isArray(I)&&"buffer"in I&&g.push(I.buffer)}return g}}),Ft,fe,tr,mr,pr,gr,jr,Hr,Wt,rr,_i,wi,bi,ta,ra,Ea,yr,ia,aa=E(()=>{ht(),ea(),Et(),Dr(),Ft=()=>!!Q.wasm.proxy&&typeof document<"u",tr=!1,mr=!1,pr=!1,Hr=new Map,Wt=(c,g)=>{let b=Hr.get(c);b?b.push(g):Hr.set(c,[g])},rr=()=>{if(tr||!mr||pr||!fe)throw new Error("worker not ready")},_i=c=>{switch(c.data.type){case"init-wasm":tr=!1,c.data.err?(pr=!0,jr[1](c.data.err)):(mr=!0,jr[0]()),gr&&(URL.revokeObjectURL(gr),gr=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let g=Hr.get(c.data.type);c.data.err?g.shift()[1](c.data.err):g.shift()[0](c.data.out);break}}},wi=async()=>{if(!mr){if(tr)throw new Error("multiple calls to 'initWasm()' detected.");if(pr)throw new Error("previous call to 'initWasm()' failed.");if(tr=!0,Ft())return new Promise((c,g)=>{fe==null||fe.terminate(),Vi().then(([b,I])=>{try{fe=I,fe.onerror=R=>g(R),fe.onmessage=_i,jr=[c,g];let S={type:"init-wasm",in:Q};if(!S.in.wasm.wasmPaths&&b){let R=Or();R&&(S.in.wasm.wasmPaths=R)}fe.postMessage(S),gr=b}catch(S){g(S)}},g)});try{await Nr(Q.wasm),await ci(Q),mr=!0}catch(c){throw pr=!0,c}finally{tr=!1}}},bi=async c=>{if(Ft())return rr(),new Promise((g,b)=>{Wt("init-ep",[g,b]);let I={type:"init-ep",in:{epName:c,env:Q}};fe.postMessage(I)});await fi(Q,c)},ta=async c=>Ft()?(rr(),new Promise((g,b)=>{Wt("copy-from",[g,b]);let I={type:"copy-from",in:{buffer:c}};fe.postMessage(I,[c.buffer])})):Re(c),ra=async(c,g)=>{if(Ft()){if(g!=null&&g.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return rr(),new Promise((b,I)=>{Wt("create",[b,I]);let S={type:"create",in:{model:c,options:{...g}}},R=[];c instanceof Uint8Array&&R.push(c.buffer),fe.postMessage(S,R)})}else return Bt(c,g)},Ea=async c=>{if(Ft())return rr(),new Promise((g,b)=>{Wt("release",[g,b]);let I={type:"release",in:c};fe.postMessage(I)});gi(c)},yr=async(c,g,b,I,S,R)=>{if(Ft()){if(b.some(C=>C[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(S.some(C=>C))throw new Error("pre-allocated output tensor is not supported for proxy.");return rr(),new Promise((C,k)=>{Wt("run",[C,k]);let M=b,F={type:"run",in:{sessionId:c,inputIndices:g,inputs:M,outputIndices:I,options:R}};fe.postMessage(F,yi(M))})}else return U(c,g,b,I,S,R)},ia=async c=>{if(Ft())return rr(),new Promise((g,b)=>{Wt("end-profiling",[g,b]);let I={type:"end-profiling",in:c};fe.postMessage(I)});hr(c)}}),na,$i,vi,xi=E(()=>{ht(),aa(),$e(),Cr(),Yi(),na=(c,g)=>{switch(c.location){case"cpu":return[c.type,c.dims,c.data,"cpu"];case"gpu-buffer":return[c.type,c.dims,{gpuBuffer:c.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[c.type,c.dims,{mlTensor:c.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${c.location} for ${g()}`)}},$i=c=>{switch(c[3]){case"cpu":return new Le(c[0],c[2],c[1]);case"gpu-buffer":{let g=c[0];if(!Fr(g))throw new Error(`not supported data type: ${g} for deserializing GPU tensor`);let{gpuBuffer:b,download:I,dispose:S}=c[2];return Le.fromGpuBuffer(b,{dataType:g,dims:c[1],download:I,dispose:S})}case"ml-tensor":{let g=c[0];if(!Wr(g))throw new Error(`not supported data type: ${g} for deserializing MLTensor tensor`);let{mlTensor:b,download:I,dispose:S}=c[2];return Le.fromMLTensor(b,{dataType:g,dims:c[1],download:I,dispose:S})}default:throw new Error(`invalid data location: ${c[3]}`)}},vi=class{async fetchModelAndCopyToWasmMemory(c){return ta(await Gr(c))}async loadModel(c,g){pt();let b;typeof c=="string"?b=await this.fetchModelAndCopyToWasmMemory(c):b=c,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await ra(b,g),ut()}async dispose(){return Ea(this.sessionId)}async run(c,g,b){pt();let I=[],S=[];Object.entries(c).forEach(K=>{let P=K[0],oe=K[1],A=this.inputNames.indexOf(P);if(A===-1)throw new Error(`invalid input '${P}'`);I.push(oe),S.push(A)});let R=[],C=[];Object.entries(g).forEach(K=>{let P=K[0],oe=K[1],A=this.outputNames.indexOf(P);if(A===-1)throw new Error(`invalid output '${P}'`);R.push(oe),C.push(A)});let k=I.map((K,P)=>na(K,()=>`input "${this.inputNames[S[P]]}"`)),M=R.map((K,P)=>K?na(K,()=>`output "${this.outputNames[C[P]]}"`):null),F=await yr(this.sessionId,S,k,C,M,b),j={};for(let K=0;K<F.length;K++)j[this.outputNames[C[K]]]=R[K]??$i(F[K]);return ut(),j}startProfiling(){}endProfiling(){ia(this.sessionId)}}}),Kr={};se(Kr,{OnnxruntimeWebAssemblyBackend:()=>Ti,initializeFlags:()=>Si,wasmBackend:()=>Ei});var Si,Ti,Ei,sa=E(()=>{ht(),aa(),xi(),Si=()=>{(typeof Q.wasm.initTimeout!="number"||Q.wasm.initTimeout<0)&&(Q.wasm.initTimeout=0);let c=Q.wasm.simd;if(typeof c!="boolean"&&c!==void 0&&c!=="fixed"&&c!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${c}". Reset it to \`false\` and ignore SIMD feature checking.`),Q.wasm.simd=!1),typeof Q.wasm.proxy!="boolean"&&(Q.wasm.proxy=!1),typeof Q.wasm.trace!="boolean"&&(Q.wasm.trace=!1),typeof Q.wasm.numThreads!="number"||!Number.isInteger(Q.wasm.numThreads)||Q.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)Q.wasm.numThreads=1;else{let g=typeof navigator>"u"?ne("node:os").cpus().length:navigator.hardwareConcurrency;Q.wasm.numThreads=Math.min(4,Math.ceil((g||1)/2))}},Ti=class{async init(c){Si(),await wi(),await bi(c)}async createInferenceSessionHandler(c,g){let b=new vi;return await b.loadModel(c,g),b}},Ei=new Ti}),oa={};se(oa,{InferenceSession:()=>kr,TRACE:()=>dt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>ut,Tensor:()=>Le,default:()=>nn,env:()=>Q,registerBackend:()=>ye}),ht(),ht(),ht();var Ia="1.22.0",nn=Ri;{let c=(sa(),be(Kr)).wasmBackend;ye("cpu",c,10),ye("wasm",c,10)}return Object.defineProperty(Q.versions,"web",{value:Ia,enumerable:!0}),be(oa)})();v.exports=W})(xc);var rh=xc.exports;(function(v){var O=vt&&vt.__createBinding||(Object.create?function(J,ce,ae,V){V===void 0&&(V=ae);var re=Object.getOwnPropertyDescriptor(ce,ae);(!re||("get"in re?!ce.__esModule:re.writable||re.configurable))&&(re={enumerable:!0,get:function(){return ce[ae]}}),Object.defineProperty(J,V,re)}:function(J,ce,ae,V){V===void 0&&(V=ae),J[V]=ce[ae]}),W=vt&&vt.__setModuleDefault||(Object.create?function(J,ce){Object.defineProperty(J,"default",{enumerable:!0,value:ce})}:function(J,ce){J.default=ce}),H=vt&&vt.__importStar||function(J){if(J&&J.__esModule)return J;var ce={};if(J!=null)for(var ae in J)ae!=="default"&&Object.prototype.hasOwnProperty.call(J,ae)&&O(ce,J,ae);return W(ce,J),ce};Object.defineProperty(v,"__esModule",{value:!0}),v.MicVAD=v.getDefaultRealTimeVADOptions=v.ort=v.DEFAULT_MODEL=void 0;const N=H(rh),Z=zi,ie=sr,ne=Sr,E=li,se=ms,Me=Ta;v.DEFAULT_MODEL="legacy",v.ort=N;const be="vad.worklet.bundle.min.js",le="silero_vad_v5.onnx",ve="silero_vad_legacy.onnx",ye=J=>({...ie.defaultFrameProcessorOptions,onFrameProcessed:()=>{},onVADMisfire:()=>{ne.log.debug("VAD misfire")},onSpeechStart:()=>{ne.log.debug("Detected speech start")},onSpeechEnd:()=>{ne.log.debug("Detected speech end")},onSpeechRealStart:()=>{ne.log.debug("Detected real speech start")},baseAssetPath:"./",onnxWASMBasePath:"./",model:J,workletOptions:{},getStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),pauseStream:async ce=>{ce.getTracks().forEach(ae=>{ae.stop()})},resumeStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),ortConfig:ce=>{ce.env.logLevel="error"},startOnLoad:!0,processorType:"auto"});v.getDefaultRealTimeVADOptions=ye;const Ae=J=>"audioWorklet"in J&&typeof AudioWorkletNode=="function"?"AudioWorklet":"ScriptProcessor";async function Ue(J,ce,ae,V,re){await ae.audioWorklet.addModule(J),ce.processorOptions={...ce.processorOptions??{},frameSamples:V};const Q=new AudioWorkletNode(ae,"vad-helper-worklet",ce);return Q.port.onmessage=async De=>{const Ie=De.data;if(!(typeof Ie=="object"&&Ie&&"message"in Ie)){console.error("Invalid message event",Ie);return}switch(Ie.message){case E.Message.AudioFrame:{if(!("data"in Ie&&Ie.data instanceof ArrayBuffer)){console.log("Audio frame message has no data");return}const Ne=new Float32Array(Ie.data);await re(Ne);break}}},Q}async function Fe(J,ce,ae){const V=new Me.Resampler({nativeSampleRate:J.sampleRate,targetSampleRate:16e3,targetFrameSize:ce});ne.log.debug("using script processor");const Q=J.createScriptProcessor(4096,1,1);let De=!1;return Q.onaudioprocess=async Ie=>{if(!De){De=!0;try{const Ne=Ie.inputBuffer.getChannelData(0);Ie.outputBuffer.getChannelData(0).fill(0);const We=V.process(Ne);for(const Ke of We)await ae(Ke)}catch(Ne){console.error("Error processing audio:",Ne)}finally{De=!1}}},Q.connect(J.destination),Q}class Ce{constructor(ce,ae,V,re,Q=!1,De=null,Ie=null,Ne=null,ot=null,We=null,Ke=null,Ot="uninitialized",Rt=!1){this.options=ce,this.frameProcessor=ae,this.model=V,this.frameSamples=re,this.listening=Q,this.errored=De,this._stream=Ie,this._audioContext=Ne,this._vadNode=ot,this._mediaStreamAudioSourceNode=We,this._audioProcessorAdapterType=Ke,this.initializationState=Ot,this.ownsAudioContext=Rt,this.getAudioInstances=()=>{if(this._stream===null||this._audioContext===null||this._vadNode==null||this._mediaStreamAudioSourceNode==null)throw new Error("MicVAD has null stream, audio context, or processor adapter");return{stream:this._stream,audioContext:this._audioContext,vadNode:this._vadNode,mediaStreamAudioSourceNode:this._mediaStreamAudioSourceNode}},this.setErrored=je=>{this.initializationState="errored",this.errored=je},this.start=async()=>{switch(this.initializationState){case"uninitialized":{ne.log.debug("initializing micVAD"),this.initializationState="initializing",this.frameProcessor.resume();try{this._stream=await this.options.getStream()}catch(je){throw je instanceof Error?this.setErrored(je.message):this.setErrored(String(je)),je}if(this.options.audioContext?(console.log("using custom audio context"),this._audioContext=this.options.audioContext):(console.log("using default audio context"),this._audioContext=new AudioContext,this.ownsAudioContext=!0),!this._audioContext)throw this.setErrored("Audio context is null"),Error("Audio context is null");switch(this._audioProcessorAdapterType=this.options.processorType=="auto"?Ae(this._audioContext):this.options.processorType,this._audioProcessorAdapterType){case"AudioWorklet":this._vadNode=await Ue(this.options.baseAssetPath+be,this.options.workletOptions,this._audioContext,this.frameSamples,this.processFrame);break;case"ScriptProcessor":this._vadNode=await Fe(this._audioContext,this.frameSamples,this.processFrame);break;default:throw new Error(`Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`)}this._mediaStreamAudioSourceNode=new MediaStreamAudioSourceNode(this._audioContext,{mediaStream:this._stream}),this._mediaStreamAudioSourceNode.connect(this._vadNode),ne.log.debug("started micVAD"),this.listening=!0,this.initializationState="initialized";break}case"initializing":{ne.log.warn("start called while initializing");break}case"initialized":{if(this.listening)return;this.listening=!0,this.frameProcessor.resume();const{stream:je,audioContext:ft,vadNode:or}=this.getAudioInstances();this._stream=await this.options.resumeStream(je);const it=new MediaStreamAudioSourceNode(ft,{mediaStream:this._stream});this._mediaStreamAudioSourceNode=it,it.connect(or);break}case"destroyed":{ne.log.warn("start called after destroyed");break}case"errored":{ne.log.error("start called after errored");break}default:{ne.log.warn("weird initialization state");break}}},this.pause=async()=>{if(!this.listening)return;this.listening=!1;const{stream:je,mediaStreamAudioSourceNode:ft}=this.getAudioInstances();await this.options.pauseStream(je),ft.disconnect(),this.frameProcessor.pause(this.handleFrameProcessorEvent)},this.destroy=async()=>{var ft;ne.log.debug("destroy called"),this.initializationState="destroyed";const{vadNode:je}=this.getAudioInstances();je instanceof AudioWorkletNode&&je.port.postMessage(E.Message.SpeechStop),this.listening&&await this.pause(),await this.model.release(),this.ownsAudioContext&&await((ft=this._audioContext)==null?void 0:ft.close())},this.setOptions=je=>{this.frameProcessor.setOptions(je)},this.processFrame=async je=>{await this.frameProcessor.process(je,this.handleFrameProcessorEvent)},this.handleFrameProcessorEvent=je=>{switch(je.msg){case E.Message.FrameProcessed:this.options.onFrameProcessed(je.probs,je.frame);break;case E.Message.SpeechStart:this.options.onSpeechStart();break;case E.Message.SpeechRealStart:this.options.onSpeechRealStart();break;case E.Message.VADMisfire:this.options.onVADMisfire();break;case E.Message.SpeechEnd:this.options.onSpeechEnd(je.audio);break}}}static async new(ce={}){const ae={...(0,v.getDefaultRealTimeVADOptions)(ce.model??v.DEFAULT_MODEL),...ce};(0,ie.validateOptions)(ae),v.ort.env.wasm.wasmPaths=ae.onnxWASMBasePath,ae.ortConfig!==void 0&&ae.ortConfig(v.ort);const V=ae.model==="v5"?le:ve,re=ae.baseAssetPath+V,Q=ae.model==="v5"?se.SileroV5.new:se.SileroLegacy.new;let De;try{De=await Q(v.ort,()=>(0,Z.defaultModelFetcher)(re))}catch(Ke){throw console.error(`Encountered an error while loading model file ${re}`),Ke}const Ie=ae.model==="v5"?512:1536,Ne=Ie/16,ot=new ie.FrameProcessor(De.process,De.reset_state,{positiveSpeechThreshold:ae.positiveSpeechThreshold,negativeSpeechThreshold:ae.negativeSpeechThreshold,redemptionMs:ae.redemptionMs,preSpeechPadMs:ae.preSpeechPadMs,minSpeechMs:ae.minSpeechMs,submitUserSpeechOnPause:ae.submitUserSpeechOnPause},Ne),We=new Ce(ae,ot,De,Ie);if(ae.startOnLoad)try{await We.start()}catch(Ke){throw console.error("Error starting micVad",Ke),Ke}return We}}v.MicVAD=Ce})(vc);(function(v){Object.defineProperty(v,"__esModule",{value:!0}),v.getDefaultRealTimeVADOptions=v.MicVAD=v.DEFAULT_MODEL=v.utils=v.NonRealTimeVAD=v.Message=v.FrameProcessor=v.defaultModelFetcher=v.baseAssetPath=void 0;var O=Sa;Object.defineProperty(v,"baseAssetPath",{enumerable:!0,get:function(){return O.baseAssetPath}});var W=zi;Object.defineProperty(v,"defaultModelFetcher",{enumerable:!0,get:function(){return W.defaultModelFetcher}});var H=sr;Object.defineProperty(v,"FrameProcessor",{enumerable:!0,get:function(){return H.FrameProcessor}});var N=li;Object.defineProperty(v,"Message",{enumerable:!0,get:function(){return N.Message}});var Z=hc;Object.defineProperty(v,"NonRealTimeVAD",{enumerable:!0,get:function(){return Z.NonRealTimeVAD}});const ie=nr;v.utils={audioFileToArray:ie.audioFileToArray,minFramesForTargetMS:ie.minFramesForTargetMS,arrayBufferToBase64:ie.arrayBufferToBase64,encodeWAV:ie.encodeWAV};var ne=vc;Object.defineProperty(v,"DEFAULT_MODEL",{enumerable:!0,get:function(){return ne.DEFAULT_MODEL}}),Object.defineProperty(v,"MicVAD",{enumerable:!0,get:function(){return ne.MicVAD}}),Object.defineProperty(v,"getDefaultRealTimeVADOptions",{enumerable:!0,get:function(){return ne.getDefaultRealTimeVADOptions}})})(cc);function ih(v){if(!(v instanceof Float32Array))throw new TypeError("samples 必须为 Float32Array");const O=new ArrayBuffer(v.length*2),W=new DataView(O);for(let H=0;H<v.length;H+=1){const N=Math.max(-1,Math.min(1,v[H])),Z=N<0?Math.round(N*32768):Math.round(N*32767);W.setInt16(H*2,Z,!0)}return O}const Tc=16e3,xr=Math.round(Tc*.12),oc=Tc*30,uc="ort-1.22.0-una-2",oi=()=>{};function ah(v){const O=String(v);return`${O.startsWith("/")?O:`/${O}`}${O.endsWith("/")?"":"/"}`}function nh(v={},O={}){const W=v.onSpeechStart||oi,H=v.onPcm||oi,N=v.onSpeechEnd||oi,Z=v.onMisfire||oi,ie=v.onError||oi,ne=O.getUserMedia||(Be=>navigator.mediaDevices.getUserMedia(Be)),E=O.createAudioContext||(()=>new AudioContext),se=O.createWorkletNode||(Be=>new AudioWorkletNode(Be,"pcm-capture",{numberOfInputs:1,numberOfOutputs:0,channelCount:1})),Me=O.createVad||(Be=>cc.MicVAD.new(Be)),be=ah(O.baseUrl||"./"),le=`${be}vad/`,ve=`${be}voice/pcm-capture.worklet.js`,ye=`${le}ort-wasm-simd-threaded.mjs?v=${uc}`,Ae=`${le}ort-wasm-simd-threaded.wasm?v=${uc}`;let Ue=null,Fe=null,Ce=null,J=null,ce=null,ae=!1,V=!1,re=!1,Q=!1,De=0,Ie=null,Ne=Promise.resolve();const ot=new Float32Array(xr);let We=0,Ke=0;function Ot(Be){for(const Le of Be)ot[Ke]=Le,Ke=(Ke+1)%xr,We=Math.min(xr,We+1)}function Rt(){const Be=new Float32Array(xr),Le=xr-We,Mt=(Ke-We+xr)%xr;for(let dt=0;dt<We;dt+=1)Be[Le+dt]=ot[(Mt+dt)%xr];return Be}function je(Be){Be.length&&(H(ih(Be)),De+=Be.length)}function ft(){return Q?(Q=!1,N(),!0):!1}async function or(){!ce||!V||re||(await ce.pause(),V&&!re&&await ce.start())}function it(Be){try{if(!V||re)return;const Le=Be==null?void 0:Be.data,Mt=Le instanceof Float32Array?Le:Le instanceof ArrayBuffer?new Float32Array(Le):null;if(!Mt)throw new TypeError("Worklet 必须发送 Float32Array 或 ArrayBuffer");if(Ot(Mt),!Q)return;const dt=oc-De;dt>0&&je(Mt.length<=dt?Mt:Mt.subarray(0,dt)),De>=oc&&(ft(),Ie||(Ie=or().catch(ie).finally(()=>{Ie=null})))}catch(Le){ie(Le)}}function Y(){!V||re||Q||(Q=!0,De=0,W(),je(Rt()))}function Ye(){ft()}function xt(){Q&&(Q=!1,Z())}async function Lt(){Ue=await ne({audio:{channelCount:1,echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}}),Fe=E(),await Fe.audioWorklet.addModule(ve),J=se(Fe),J.port.onmessage=it,Ce=Fe.createMediaStreamSource(Ue),Ce.connect(J),ce=await Me({model:"v5",redemptionMs:400,minSpeechMs:250,preSpeechPadMs:120,baseAssetPath:le,onnxWASMBasePath:le,ortConfig:Be=>{Be.env.logLevel="error",Be.env.wasm.numThreads=1,Be.env.wasm.proxy=!1,Be.env.wasm.wasmPaths={mjs:ye,wasm:Ae}},audioContext:Fe,startOnLoad:!1,getStream:async()=>Ue,pauseStream:async()=>{},resumeStream:async()=>Ue,onSpeechStart:Y,onSpeechEnd:Ye,onVADMisfire:xt}),ae=!0}async function Tr(){if(re)throw new Error("语音采集器已销毁");if(!V)try{ae||await Lt(),Fe.state==="suspended"&&await Fe.resume(),await ce.start(),V=!0}catch(Be){throw ie(Be),await di().catch(ie),Be}}async function Er(){!ae||!V||(V=!1,ft(),await ce.pause(),Fe.state!=="closed"&&await Fe.suspend())}async function di(){re||(re=!0,V=!1,Q=!1,Ie&&await Ie.catch(oi),ce&&(await ce.pause(),await ce.destroy()),Ce&&Ce.disconnect(),J&&(J.port.onmessage=null,J.disconnect()),Fe&&Fe.state!=="closed"&&await Fe.close(),Ue&&Ue.getTracks().forEach(Be=>Be.stop()))}function He(Be){const Le=Ne.then(Be,Be);return Ne=Le.catch(oi),Le}return{start:()=>He(Tr),pause:()=>He(Er),destroy:()=>He(di)}}const sh=new Set(["vad_endpoint","first_audio","buffer_depth","starvation","barge_in_stop"]),oh=new Set(["started","completed","accepted","cancelled","stale","underflow","error"]),uh=["turn_id","sequence","byte_count"];function va(v,O){return Reflect.get(v,O)}function lh(v){if(!v||typeof v!="object")return null;try{const O=va(v,"stage");if(!sh.has(O))return null;const W={stage:O},H=va(v,"session_id");typeof H=="string"&&H.length&&(W.session_id=H.slice(0,8));const N=va(v,"status");oh.has(N)&&(W.status=N);for(const ie of uh){const ne=va(v,ie);Number.isSafeInteger(ne)&&ne>=0&&(W[ie]=ne)}const Z=va(v,"duration_ms");return typeof Z=="number"&&Number.isFinite(Z)&&Z>=0&&(W.duration_ms=Math.round(Z*1e3)/1e3),Object.freeze(W)}catch{return null}}function dh(v=O=>console.info("[VoiceCallMetric]",O)){return O=>{try{const W=lh(O);W&&v(W)}catch{}}}function ph(v={}){const O=v.now||(()=>performance.now()),W=dh(v.reportMetric),H=new Set;let N=Object.freeze({state:"ended",sessionId:null,activeTurnId:null,muted:!1,transcript:"",assistantText:"",error:null});const Z=(Y,Ye={})=>{Y==="pcm_playback_underflow"&&W({session_id:N==null?void 0:N.sessionId,turn_id:Ye.turn_id,sequence:Ye.sequence,stage:"starvation",status:"underflow",duration_ms:Ye.gap_ms})},ie=v.player||(v.createPlayer||Uf)({...v.playerDependencies,reportMetric:Z});let ne=0,E=0,se=!1,Me=!1,be=!1,le=!1,ve=null,ye=null,Ae=null,Ue=0,Fe=null,Ce=null;function J(Y){N=Object.freeze({...N,...Y});for(const Ye of H)Ye(N)}function ce(Y){J({state:"error",error:Y instanceof Error?Y.message:String(Y)})}function ae(Y){return Number.isSafeInteger(Y.turn_id)&&Y.turn_id===N.activeTurnId&&Y.session_id===N.sessionId&&N.state!=="ended"}function V(){const Y=N.activeTurnId;if(!Y||!N.sessionId)return;const Ye=O(),xt=ie.interrupt(Y);W({session_id:N.sessionId,turn_id:Y,stage:"barge_in_stop",status:xt!=null&&xt.accepted?"completed":"stale",duration_ms:Math.max(0,O()-Ye)}),Ke.sendInterrupt(N.sessionId,Y)}function re(){!N.sessionId||N.muted||be||N.state==="connecting"||N.state==="ended"||(N.activeTurnId!==null&&V(),ne+=1,E=0,se=!0,Ae=O(),Ue=0,Fe=null,Ce=null,Ke.sendSpeechStart(N.sessionId,ne),J({state:"listening",activeTurnId:ne,transcript:"",assistantText:"",error:null}))}function Q(Y){if(!se||N.muted||!N.sessionId||N.activeTurnId===null)return;Ke.sendAudio(N.sessionId,N.activeTurnId,E,Y).accepted&&(E+=1,Number.isSafeInteger(Y==null?void 0:Y.byteLength)&&(Ue+=Y.byteLength))}function De(){if(!se||!N.sessionId||N.activeTurnId===null)return;se=!1,Ke.sendSpeechEnd(N.sessionId,N.activeTurnId);const Y=O();W({session_id:N.sessionId,turn_id:N.activeTurnId,stage:"vad_endpoint",status:"completed",duration_ms:Ae===null?0:Math.max(0,Y-Ae),byte_count:Ue}),Fe=Y,J({state:"recognizing"})}function Ie(){se&&(se=!1,W({session_id:N.sessionId,turn_id:N.activeTurnId,stage:"vad_endpoint",status:"cancelled",duration_ms:Ae===null?0:Math.max(0,O()-Ae),byte_count:Ue}),V(),J({state:"listening",activeTurnId:null}))}const Ne=v.capture||(v.createCapture||nh)({onSpeechStart:re,onPcm:Q,onSpeechEnd:De,onMisfire:Ie,onError:Y=>{Rt(Y)}},v.captureDependencies);async function ot(Y){if(Y.type==="call_ready"){if(N.state!=="connecting"||N.sessionId)return;J({sessionId:Y.session_id}),await Ne.start(),J({state:"listening"});return}if(Y.type==="call_ended"){if(Y.session_id!==N.sessionId)return;be=!0,se=!1,detachVisibilityListener(),await Ot(),Ke.disconnect(),J({state:"ended",activeTurnId:null,sessionId:null});return}ae(Y)&&(Y.type==="transcript_final"?J({state:"thinking",transcript:Y.text}):Y.type==="assistant_text_delta"?J({state:"thinking",assistantText:`${N.assistantText}${Y.text}`}):Y.type==="tts_start"?(ie.start(Y.turn_id,{sample_rate:Y.sample_rate,channels:Y.channels,sample_width:Y.sample_width}),J({state:"speaking"})):Y.type==="tts_end"?(ie.seal(Y.turn_id),J({state:"listening"})):Y.type==="turn_ignored"?(ie.interrupt(Y.turn_id),J({state:"listening",activeTurnId:null,error:Y.message})):Y.type==="turn_cancelled"?(ie.interrupt(Y.turn_id),J({state:Y.reason==="barge_in"?"listening":"interrupted",activeTurnId:null})):Y.type==="call_error"&&(ie.interrupt(Y.turn_id),J({state:"error",activeTurnId:null,error:Y.message})))}function We(Y,Ye){if(!ae(Y))return;const xt=ie.enqueue(Y.turn_id,Y.sequence,Ye);if(!(xt!=null&&xt.accepted))return;Ce!==Y.turn_id&&(Ce=Y.turn_id,W({session_id:N.sessionId,turn_id:Y.turn_id,sequence:Y.sequence,stage:"first_audio",status:"accepted",duration_ms:Fe===null?0:Math.max(0,O()-Fe),byte_count:Ye==null?void 0:Ye.byteLength}));const Lt=typeof ie.snapshot=="function"?ie.snapshot():null;Number.isSafeInteger(Lt==null?void 0:Lt.bufferedMs)&&Lt.bufferedMs>=0&&W({session_id:N.sessionId,turn_id:Y.turn_id,sequence:Y.sequence,stage:"buffer_depth",status:"accepted",duration_ms:Lt.bufferedMs,byte_count:Ye==null?void 0:Ye.byteLength})}const Ke=v.socket||(v.createSocket||qf)({...v.socketDependencies,onControl:Y=>ot(Y).catch(Rt),onPcm:We,onError:ce,onClose:()=>{!be&&N.state!=="ended"&&Rt(new Error("语音连接已断开"))}});function Ot(){return ye||(ye=Promise.allSettled([Ne.destroy(),ie.destroy()])),ye}function Rt(Y){return ce(Y),ve||(le=!0,se=!1,ve=Ot().finally(()=>Ke.disconnect())),ve}async function je(){if(be)throw new Error("通话已经结束");if(le)throw new Error("语音模块初始化失败，请重新加载通话");if(Me){N.state==="interrupted"&&!N.muted&&(await Ne.start(),J({state:"listening"}));return}Me=!0,J({state:"connecting",error:null});try{if(await Ke.connect(),!Ke.sendCallStart().accepted)throw new Error("无法开始语音通话")}catch(Y){throw ce(Y),Y}}async function ft(){if(be||!Me)return N.muted;const Y=!N.muted;return J({muted:Y}),Y?(se=!1,V(),await Ne.pause(),J({state:"interrupted",activeTurnId:null})):(await Ne.start(),J({state:"listening"})),Y}async function or(){be||(be=!0,se=!1,N.activeTurnId!==null&&ie.interrupt(N.activeTurnId),N.sessionId&&Ke.sendCallEnd(N.sessionId),await Ot(),Ke.disconnect(),J({state:"ended",activeTurnId:null,sessionId:null}))}function it(Y){return H.add(Y),Y(N),()=>H.delete(Y)}return{start:je,end:or,toggleMute:ft,subscribe:it,snapshot:()=>N}}const ch=Object.freeze({state:"ended",transcript:"",assistantText:"",error:null,muted:!1});function fh(v){const O=ar.useRef(null),W=ar.useRef(null),[H,N]=ar.useState(ch),Z=ar.useCallback(()=>{if(!O.current){const be=ph();O.current=be,W.current=be.subscribe(N)}return O.current},[]),ie=ar.useCallback(async()=>{v&&await Z().start()},[v,Z]),ne=ar.useCallback(async()=>{var le;const be=O.current;be&&(await be.end(),(le=W.current)==null||le.call(W),W.current=null,O.current=null)},[]),E=ar.useCallback(async()=>{O.current&&await O.current.start()},[]),se=ar.useCallback(async()=>{O.current&&await O.current.toggleMute()},[]),Me=ar.useCallback(()=>{window.location.reload()},[]);return ar.useEffect(()=>()=>{var be,le;(be=W.current)==null||be.call(W),(le=O.current)==null||le.end()},[]),{status:H.state,userTranscript:H.transcript,assistantText:H.assistantText,error:H.error||"",muted:H.muted,startCall:ie,endCall:ne,continueCall:E,toggleMute:se,reloadCall:Me}}const hh={connecting:"正在连接 UNA",listening:"UNA 正在倾听",recognizing:"正在识别你的话",thinking:"UNA 正在思考",speaking:"UNA 正在说话",interrupted:"通话已暂停",error:"通话遇到问题",ended:"准备好后开始通话"};function yh({authenticated:v}){const O=fh(v),W=!["ended","error"].includes(O.status);return lt.jsxs("main",{className:"voice-call-page",children:[lt.jsx("a",{className:"voice-call-back",href:"./",children:"返回 UNA"}),lt.jsxs("section",{className:"voice-call-card","aria-label":"UNA 实时语音通话",children:[lt.jsx("div",{className:`voice-call-orb voice-call-orb--${O.status}`,"aria-hidden":"true",children:"UNA"}),lt.jsx("p",{className:"voice-call-status","aria-live":"polite",children:hh[O.status]||"UNA 实时语音"}),O.error&&lt.jsx("p",{className:"voice-call-error",role:"alert",children:O.error}),lt.jsxs("div",{className:"voice-call-transcript","aria-live":"polite",children:[O.userTranscript&&lt.jsxs("p",{children:[lt.jsx("span",{children:"你"}),O.userTranscript]}),O.assistantText&&lt.jsxs("p",{children:[lt.jsx("span",{children:"UNA"}),O.assistantText]})]}),lt.jsxs("div",{className:"voice-call-actions",children:[O.status==="ended"&&lt.jsx("button",{className:"voice-call-primary",onClick:O.startCall,children:"开始通话"}),O.status==="interrupted"&&!O.muted&&lt.jsx("button",{className:"voice-call-primary",onClick:O.continueCall,children:"继续通话"}),O.status==="error"&&lt.jsx("button",{className:"voice-call-primary",onClick:O.reloadCall,children:"重新加载通话"}),W&&lt.jsx("button",{className:"voice-call-round",onClick:O.toggleMute,"aria-label":O.muted?"取消静音":"静音麦克风",children:O.muted?lt.jsx(kf,{}):lt.jsx(If,{})}),O.status!=="ended"&&lt.jsx("button",{className:"voice-call-round voice-call-round--danger",onClick:O.endCall,"aria-label":"结束通话",children:lt.jsx(Cf,{})})]})]})]})}export{yh as default};
