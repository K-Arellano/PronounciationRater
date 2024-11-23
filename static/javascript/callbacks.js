// Audio context initialization
let mediaRecorder, audioChunks, audioBlob, stream, audioRecorded;
const ctx = new AudioContext();
let lettersOfWordAreCorrect = [];

// UI-related variables
const page_title = "AI Pronunciation Trainer";
const accuracy_colors = ["green", "orange", "red"];
let badScoreThreshold = 30;
let mediumScoreThreshold = 70;
let currentSample = 0;
let currentScore = 0.;
let sample_difficult = 0;
let scoreMultiplier = 1;
let playAnswerSounds = false;
let isRecording = false;
let serverIsInitialized = false;
let serverWorking = true;
let languageFound = true;
let currentText, currentIpa, real_transcripts_ipa, matched_transcripts_ipa;
let wordCategories;
let startTime, endTime;

// API related variables 
let AILanguage = "en"; // Default language set to English
let STScoreAPIKey = 'rll5QsTiv83nti99BW6uCmvs9BDVxSB39SVFceYb';

// Speech generation
var synth = window.speechSynthesis;
let voice_idx = 0;
let voice_synth = null;

//############################ UI general control functions ###################
const unblockUI = () => {
    document.getElementById("recordAudio").classList.remove('disabled');
    document.getElementById("buttonNext").onclick = () => getNextSample();
    document.getElementById("nextButtonDiv").classList.remove('disabled');
    document.getElementById("original_script").classList.remove('disabled');
    document.getElementById("buttonNext").style["background-color"] = '#58636d';
};

const blockUI = () => {
    document.getElementById("recordAudio").classList.add('disabled');
    document.getElementById("buttonNext").onclick = null;
    document.getElementById("original_script").classList.add('disabled');
    document.getElementById("buttonNext").style["background-color"] = '#adadad';
};

const UIError = () => {
    blockUI();
    document.getElementById("buttonNext").onclick = () => getNextSample(); // If error, user can only try to get a new sample
    document.getElementById("buttonNext").style["background-color"] = '#58636d';
    document.getElementById("recorded_ipa_script").innerHTML = "";
    document.getElementById("single_word_ipa_pair").innerHTML = "Error";
    document.getElementById("ipa_script").innerHTML = "Error";
    document.getElementById("main_title").innerHTML = 'Server Error';
    document.getElementById("original_script").innerHTML = 'Server error. Try again later or download the local version from Github :)';
};

const updateScore = (currentPronunciationScore) => {
    if (isNaN(currentPronunciationScore)) return;
    currentScore += currentPronunciationScore * scoreMultiplier;
    currentScore = Math.round(currentScore);
};

const getNextSample = async () => {
    blockUI();
    if (!serverIsInitialized) await initializeServer();
    if (!serverWorking) {
        UIError();
        return;
    }
    updateScore(parseFloat(document.getElementById("pronunciation_accuracy").innerHTML));
    document.getElementById("main_title").innerHTML = "Processing new sample...";

    try {
        await fetch(apiMainPathSample + '/getSample', {
            method: "post",
            body: JSON.stringify({
                "category": sample_difficult.toString(), "language": AILanguage
            }),
            headers: { "X-Api-Key": STScoreAPIKey }
        }).then(res => res.json())
          .then(data => {
                document.getElementById("original_script").innerHTML = data.real_transcript;
                currentIpa = data.ipa_transcript;
                document.getElementById("ipa_script").innerHTML = "/ " + currentIpa + " /";
                document.getElementById("recorded_ipa_script").innerHTML = "";
                document.getElementById("pronunciation_accuracy").innerHTML = "";
                document.getElementById("section_accuracy").innerHTML = "| Score: " + currentScore.toString() + " - (" + currentSample.toString() + ")";
                currentSample += 1;
                document.getElementById("main_title").innerHTML = page_title;
                currentSoundRecorded = false;
                unblockUI();
          });
    } catch {
        UIError();
    }
};

const updateRecordingState = async () => {
    if (isRecording) {
        stopRecording();
    } else {
        recordSample();
    }
}

const recordSample = async () => {
    document.getElementById("main_title").innerHTML = "Recording... click again when done speaking";
    document.getElementById("recordIcon").innerHTML = 'pause_presentation';
    blockUI();
    audioChunks = [];
    isRecording = true;
    mediaRecorder.start();
}

const changeLanguage = (language, generateNewSample = false) => {
    voices = synth.getVoices();
    AILanguage = language;
    languageFound = false;
    let languageIdentifier, languageName;
    switch (language) {
        case 'en':
            document.getElementById("languageBox").innerHTML = "English";
            languageIdentifier = 'en';
            languageName = 'Daniel';
            break;
    }

    for (let idx = 0; idx < voices.length; idx++) {
        if (voices[idx].lang.slice(0, 2) == languageIdentifier && voices[idx].name == languageName) {
            voice_synth = voices[idx];
            languageFound = true;
            break;
        }
    }
    if (generateNewSample) getNextSample();
}

// Speech-To-Score function
const mediaStreamConstraints = {
    audio: {
        channelCount: 1,
        sampleRate: 48000
    }
}

const startMediaDevice = () => {
    navigator.mediaDevices.getUserMedia(mediaStreamConstraints).then(_stream => {
        stream = _stream;
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorder.onstop = async () => {
            document.getElementById("recordIcon").innerHTML = 'mic';
            blockUI();

            audioBlob = new Blob(audioChunks, { type: 'audio/ogg;' });
            let audioBase64 = await convertBlobToBase64(audioBlob);

            let minimumAllowedLength = 6;
            if (audioBase64.length < minimumAllowedLength) {
                setTimeout(UIRecordingError, 50);
                return;
            }

            try {
                await fetch(apiMainPathSTS + '/GetAccuracyFromRecordedAudio', {
                    method: "post",
                    body: JSON.stringify({ "title": currentText[0], "base64Audio": audioBase64, "language": AILanguage }),
                    headers: { "X-Api-Key": STScoreAPIKey }
                }).then(res => res.json())
                  .then(data => {
                      document.getElementById("recorded_ipa_script").innerHTML = "/ " + data.ipa_transcript + " /";
                      document.getElementById("pronunciation_accuracy").innerHTML = data.pronunciation_accuracy + "%";
                      lettersOfWordAreCorrect = data.is_letter_correct_all_words.split(" ");
                      startTime = data.start_time;
                      endTime = data.end_time;
                      real_transcripts_ipa = data.real_transcripts_ipa.split(" ");
                      matched_transcripts_ipa = data.matched_transcripts_ipa.split(" ");
                      wordCategories = data.pair_accuracy_category.split(" ");
                      currentSoundRecorded = true;
                      unblockUI();
                  });
            } catch {
                UIError();
            }
        };
    });
};
startMediaDevice();
