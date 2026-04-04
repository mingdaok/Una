from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from diary_service import DiaryService
import os

app = Flask(__name__)
CORS(app)

service = DiaryService()

@app.route('/api/memories', methods=['GET'])
def get_memories():
    return jsonify(service.get_all_memories())

@app.route('/api/generate', methods=['POST'])
def generate():
    content = request.json.get('content')
    if not content: return jsonify({"error": "No content"}), 400
    return jsonify(service.generate_diary(content))

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    print("🚀 Una Backend Running on http://localhost:5000")
    app.run(port=5000, debug=True)
