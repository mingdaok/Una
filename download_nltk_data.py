#!/usr/bin/env python
# -*- coding: utf-8 -*-

import nltk

print("正在下载 NLTK 数据包...")
print("=" * 50)

# 下载常用的数据包
packages = [
    'punkt',                      # 句子和单词分词器
    'averaged_perceptron_tagger', # POS 标注
    'averaged_perceptron_tagger_eng',  # 英文POS标注器（GPT-SoVITS需要）
    'maxent_ne_chunker',          # 命名实体识别
    'words',                       # 单词列表
    'universal_tagset',           # 通用标签集
    'stopwords',                  # 停用词
    'wordnet',                    # WordNet 词典
    'wordnet_ic',                 # WordNet 信息内容
    'omw-1.4',                    # Open Multilingual Wordnet
]

for package in packages:
    try:
        print(f"下载 {package}...", end=" ")
        nltk.download(package, quiet=True)
        print("✓")
    except Exception as e:
        print(f"✗ (错误: {e})")

print("=" * 50)
print("NLTK 数据包下载完成！")
print(f"数据位置: {nltk.data.path}")
