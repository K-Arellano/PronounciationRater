import unittest

import ModelInterfaces
import lambdaGetSample
import RuleBasedModels
import epitran
import json
import pronunciationTrainer


def test_category(category: int, threshold_min: int, threshold_max: int):
    event = {'body': json.dumps({'category': category, 'language': 'en'})}
    for _ in range(1000):
        response = lambdaGetSample.lambda_handler(event, [])
        response_dict = json.loads(response)
        number_of_words = len(
            response_dict['real_transcript'][0].split())
        length_valid = number_of_words > threshold_min and number_of_words <= threshold_max
        if not length_valid:
            print('Category ', category,
                  ' had a sentence with length ', number_of_words)
            return False
    return True


class TestDataset(unittest.TestCase):

    def test_random_sentences(self):

        self.assertFalse(test_category(0, 0, 8))

    def test_easy_sentences(self):

        self.assertTrue(test_category(1, 0, 8))

    def test_normal_sentences(self):
        self.assertTrue(test_category(2, 8, 20))

    def test_hard_sentences(self):
        self.assertTrue(test_category(3, 20, 10000))


def check_phonem_converter(converter: ModelInterfaces.ITextToPhonemModel, input: str, expected_output: str):
    output = converter.convertToPhonem(input)

    is_correct = output == expected_output
    if not is_correct:
        print('Conversion from "', input, '" should be "',
              expected_output, '", but was "', output, '"')
    return is_correct


class TestPhonemConverter(unittest.TestCase):

    def test_english(self):
        phonem_converter = RuleBasedModels.EngPhonemConverter()
        self.assertTrue(check_phonem_converter(
            phonem_converter, 'Hello, this is a test', 'hɛˈloʊ, ðɪs ɪz ə tɛst'))


trainer_SST_lambda = {}
trainer_SST_lambda['en'] = pronunciationTrainer.getTrainer("en")


class TestScore(unittest.TestCase):

    def test_exact_transcription(self):
        words_real = 'Hello, this is a test'

        real_and_transcribed_words, _, _ = trainer_SST_lambda['en'].matchSampleAndRecordedWords(
            words_real, words_real)

        pronunciation_accuracy, _ = trainer_SST_lambda['en'].getPronunciationAccuracy(
            real_and_transcribed_words)

        self.assertTrue(int(pronunciation_accuracy) == 100)

    def test_incorrect_transcription(self):
        words_real = 'Hello, this is a test'
        words_transcribed = 'Helo, this iz a test'

        real_and_transcribed_words, _, _ = trainer_SST_lambda['en'].matchSampleAndRecordedWords(
            words_real, words_transcribed)

        pronunciation_accuracy, _ = trainer_SST_lambda['en'].getPronunciationAccuracy(
            real_and_transcribed_words)

        self.assertTrue(int(pronunciation_accuracy) == 85)


if __name__ == '__main__':
    unittest.main()
