import torch
import torch.nn as nn
import pickle
from transformers import AutoTokenizer
from transformers import AutoModelForSeq2SeqLM

def getASRModel(language: str) -> nn.Module:
    if language == 'en':
        model, decoder, utils = torch.hub.load(repo_or_dir='snakers4/silero-models',
                                               model='silero_stt',
                                               language='en',
                                               device=torch.device('cpu'))
    else:
        raise ValueError('Language not implemented')

    return model, decoder


def getTTSModel(language: str) -> nn.Module:
    if language == 'en':
        speaker = 'lj_16khz'  # 16 kHz
        model = torch.hub.load(repo_or_dir='snakers4/silero-models',
                               model='silero_tts',
                               language=language,
                               speaker=speaker)
    else:
        raise ValueError('Language not implemented')

    return model


def getTranslationModel(language: str) -> nn.Module:
    if language == 'en':
        model = AutoModelForSeq2SeqLM.from_pretrained(
            "Helsinki-NLP/opus-mt-en-de")
        tokenizer = AutoTokenizer.from_pretrained(
            "Helsinki-NLP/opus-mt-en-de")
        # Cache models to avoid Hugging face processing
        with open('translation_model_en.pickle', 'wb') as handle:
            pickle.dump(model, handle)
        with open('translation_tokenizer_en.pickle', 'wb') as handle:
            pickle.dump(tokenizer, handle)
    else:
        raise ValueError('Language not implemented')

    return model, tokenizer
