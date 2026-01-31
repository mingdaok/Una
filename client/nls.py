import time
import json
import logging
import threading
import websocket
import uuid # 导入 uuid

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

class NlsSpeechTranscriber:
    """
    阿里云实时语音识别 SDK (修复 TaskID 不一致问题)
    """
    def __init__(self, url, akid, aksecret, appkey, on_result_changed=None, on_completed=None, on_error=None, on_close=None, region_id="cn-shanghai"):
        self.__url = url
        self.__appkey = appkey
        self.__akid = akid
        self.__aksecret = aksecret
        self.__region_id = region_id
        self.__on_result_changed = on_result_changed
        self.__on_completed = on_completed
        self.__on_error = on_error
        self.__on_close = on_close
        
        self.__ws = None
        self.__thread = None
        self.__token = None
        self.__task_id = None # 🔥 新增：用来记住当前的身份证
        self.__namespace = "SpeechTranscriber"

    def start(self, aformat="pcm", enable_intermediate_result=True, enable_punctuation_prediction=True, enable_inverse_text_normalization=True):
        self.__token = self.__create_token()
        if not self.__token:
            if self.__on_error: self.__on_error("Token生成失败 (请检查Key)")
            return

        ws_url = f"{self.__url}?token={self.__token}"
        self.__ws = websocket.WebSocketApp(ws_url,
                                           on_message=self.__on_message,
                                           on_error=self.__on_error_callback,
                                           on_close=self.__on_close_callback)
        
        self.__thread = threading.Thread(target=self.__ws.run_forever)
        self.__thread.daemon = True
        self.__thread.start()
        time.sleep(0.5)
        
        # 🔥 关键修复：生成并保存 TaskID
        self.__task_id = self.__get_uuid()
        
        start_cmd = {
            "header": {
                "message_id": self.__get_uuid(),
                "task_id": self.__task_id, # 使用保存的 ID
                "namespace": self.__namespace,
                "name": "StartTranscription",
                "appkey": self.__appkey
            },
            "payload": {
                "format": aformat,
                "sample_rate": 16000,
                "enable_intermediate_result": enable_intermediate_result,
                "enable_punctuation_prediction": enable_punctuation_prediction,
                "enable_inverse_text_normalization": enable_inverse_text_normalization
            }
        }
        self.send_json(start_cmd)

    def send_audio(self, data):
        if self.__ws and self.__ws.sock and self.__ws.sock.connected:
            self.__ws.send(data, opcode=websocket.ABNF.OPCODE_BINARY)

    def stop(self):
        # 🔥 关键修复：使用同一个 TaskID 结束任务
        stop_cmd = {
            "header": {
                "message_id": self.__get_uuid(),
                "task_id": self.__task_id, # 使用保存的 ID
                "namespace": self.__namespace,
                "name": "StopTranscription",
                "appkey": self.__appkey
            },
            "payload": {}
        }
        self.send_json(stop_cmd)
        time.sleep(0.2)
        if self.__ws:
            self.__ws.close()

    def send_json(self, data):
        if self.__ws and self.__ws.sock and self.__ws.sock.connected:
            self.__ws.send(json.dumps(data))

    def __create_token(self):
        try:
            from aliyunsdkcore.client import AcsClient
            from aliyunsdkcore.request import CommonRequest
            
            # Token 必须去上海拿
            client = AcsClient(self.__akid, self.__aksecret, "cn-shanghai")
            request = CommonRequest()
            request.set_domain('nls-meta.cn-shanghai.aliyuncs.com')
            request.set_version('2019-02-28')
            request.set_action_name('CreateToken')
            
            response = client.do_action_with_exception(request)
            return json.loads(response)['Token']['Id']
        except Exception as e:
            logger.error(f"Get Token Failed: {e}")
            return None

    def __on_message(self, ws, message):
        try:
            msg = json.loads(message)
            name = msg['header']['name']
            if name == 'TranscriptionResultChanged':
                if self.__on_result_changed: self.__on_result_changed(message)
            elif name == 'TranscriptionCompleted':
                if self.__on_completed: self.__on_completed(message)
            elif name == 'TaskFailed':
                if self.__on_error: self.__on_error(msg['header']['status_text'])
        except: pass

    def __on_error_callback(self, ws, error):
        if self.__on_error: self.__on_error(str(error))

    def __on_close_callback(self, ws, *args):
        if self.__on_close: self.__on_close()

    def __get_uuid(self):
        return str(uuid.uuid4()).replace('-', '')