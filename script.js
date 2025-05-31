const { motion, AnimatePresence } = Framer; // Destructure from global Framer object

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const splashScreen = document.getElementById('splash-screen');
    const splashLogo = splashScreen.querySelector('.splash-logo');
    const appContainer = document.getElementById('app-container');
    const textToSpeakInput = document.getElementById('text-to-speak');
    const speakButton = document.getElementById('speak-button');
    const speakButtonText = speakButton.querySelector('span');
    const speakButtonIcon = speakButton.querySelector('i');
    const voiceSelect = document.getElementById('voice-select');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const statusMessage = document.getElementById('status-message');
    const currentYearSpan = document.getElementById('current-year');
    const historyEmptyPlaceholder = document.querySelector('.history-empty-placeholder');

    // Guided Tour Elements
    const guidedTourModal = document.getElementById('guided-tour');
    const tourSteps = document.querySelectorAll('.tour-step');
    const tourNextButtons = document.querySelectorAll('.tour-next-btn');
    const tourPrevButtons = document.querySelectorAll('.tour-prev-btn');
    const tourFinishButton = document.getElementById('tour-finish-btn');

    // TTS and State
    let speechSynthesisInstance = window.speechSynthesis;
    let voices = [];
    let appHistory = JSON.parse(localStorage.getItem('teluguTTSHistory_Ganesh')) || [];

    // --- Initialization ---
    function initializeApp() {
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
        
        // Framer Motion for Splash Screen (iPhone boot like)
        motion(splashLogo, {
            initial: { scale: 0.5, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: { duration: 0.8, ease: "circOut", delay: 0.2 }
        });
        motion(splashScreen, { // Fade out splash screen
            initial: { opacity: 1 },
            animate: { opacity: 0 },
            transition: { duration: 0.5, delay: 2.5, // Show splash for ~2.5s
                onComplete: () => {
                    splashScreen.style.display = "none";
                    checkFirstVisit();
                }
            }
        });

        if (!speechSynthesisInstance) {
            showStatus("మీ బ్రౌజర్ స్పీచ్ సింథసిస్‌కు మద్దతు ఇవ్వదు.", "error", true);
            speakButton.disabled = true;
            voiceSelect.disabled = true;
            // Still show app content if tour is skipped or finished
            if (localStorage.getItem('teluguTTSVisited_Ganesh')) {
                 showAppContent();
            }
            return;
        }

        loadVoices();
        if (speechSynthesisInstance.onvoiceschanged !== undefined) {
            speechSynthesisInstance.onvoiceschanged = loadVoices;
        }

        renderHistory();
        setupEventListeners();
        applyFramerToButtons();
    }

    // --- Framer Motion for Buttons ---
    function applyFramerToButtons() {
        const buttons = [speakButton, clearHistoryButton, ...tourNextButtons, ...tourPrevButtons, tourFinishButton];
        buttons.forEach(btn => {
            if (!btn) return;
            // Enhance existing buttons with Framer Motion properties
            // This is a basic example. For more complex scenarios with dynamically created elements,
            // you'd construct them as motion.button directly.
            const originalBg = btn.classList.contains('secondary') ? getComputedStyle(btn).backgroundColor : window.getComputedStyle(btn).getPropertyValue('--accent-color');
            const hoverBg = btn.classList.contains('secondary') ? 'rgba(255, 214, 10, 0.2)' : window.getComputedStyle(btn).getPropertyValue('--secondary-accent-color');
            
            btn.addEventListener('mouseenter', () => {
                if (btn.disabled) return;
                motion(btn, { scale: 1.05, backgroundColor: hoverBg }, { duration: 0.15 });
            });
            btn.addEventListener('mouseleave', () => {
                 if (btn.disabled) return;
                motion(btn, { scale: 1, backgroundColor: originalBg }, { duration: 0.15 });
            });
            btn.addEventListener('mousedown', () => {
                 if (btn.disabled) return;
                motion(btn, { scale: 0.95 }, { duration: 0.1 });
            });
            btn.addEventListener('mouseup', () => {
                 if (btn.disabled) return;
                motion(btn, { scale: 1.05 }, { duration: 0.1 }); // Return to hover scale
            });
        });
    }


    // --- Splash & Guided Tour Logic ---
    function checkFirstVisit() {
        if (!localStorage.getItem('teluguTTSVisited_Ganesh')) {
            showGuidedTour();
        } else {
            showAppContent();
        }
    }

    function showGuidedTour() {
        guidedTourModal.style.display = 'flex'; // Set display before animation
        motion(guidedTourModal, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.4 }
        });
        showTourStep('tour-step-1');
    }

    function showAppContent() {
        if (guidedTourModal.style.display !== "none") {
            motion(guidedTourModal, {
                animate: { opacity: 0 },
                transition: { 
                    duration: 0.3, 
                    onComplete: () => guidedTourModal.style.display = "none"
                }
            });
        }
        appContainer.style.display = 'flex'; // Set display before animation
        motion(appContainer, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, delay: 0.1 }
        });
    }

    function showTourStep(stepId) {
        tourSteps.forEach(step => {
            const isTargetStep = step.id === stepId;
            step.style.display = 'block'; // Ensure Framer can animate it
            motion(step, {
                initial: { opacity: 0, x: step.id === currentTourStepId ? 0 : (stepId > currentTourStepId ? 50 : -50) },
                animate: { opacity: isTargetStep ? 1 : 0, x: isTargetStep ? 0 : (stepId > currentTourStepId ? -50 : 50) },
                transition: { duration: 0.35, ease: "easeInOut", 
                    onComplete: () => { if (!isTargetStep) step.style.display = 'none';}
                }
            });
        });
        currentTourStepId = stepId; // Keep track of current step
    }
    let currentTourStepId = 'tour-step-1'; // Initial step


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        speakButton.addEventListener('click', handleSpeak);
        clearHistoryButton.addEventListener('click', clearAppHistory);

        tourNextButtons.forEach(button => {
            button.addEventListener('click', () => showTourStep(button.dataset.next));
        });
        tourPrevButtons.forEach(button => {
            button.addEventListener('click', () => showTourStep(button.dataset.prev));
        });
        tourFinishButton.addEventListener('click', () => {
            localStorage.setItem('teluguTTSVisited_Ganesh', 'true');
            showAppContent();
        });
    }

    // --- Speech Synthesis ---
    function loadVoices() {
        voices = speechSynthesisInstance.getVoices();
        voiceSelect.innerHTML = ''; // Clear previous options
        const teluguVoices = voices.filter(voice => voice.lang.startsWith('te'));

        if (teluguVoices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'తెలుగు వాయిస్ అందుబాటులో లేదు';
            option.value = '';
            voiceSelect.appendChild(option);
            voiceSelect.disabled = true;
            if (speechSynthesisInstance) { // Only show if TTS is supported
                 showStatus("మీ సిస్టమ్‌లో తెలుగు వాయిస్ కనుగొనబడలేదు.", "info");
            }
            return;
        }
        
        voiceSelect.disabled = false;
        teluguVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
        });
        if (voiceSelect.options.length > 0) voiceSelect.selectedIndex = 0;
    }

    function handleSpeak() {
        const text = textToSpeakInput.value.trim();
        if (!text) {
            showStatus("దయచేసి మాట్లాడటానికి కొంత వచనాన్ని నమోదు చేయండి.", "error");
            animateInputError(textToSpeakInput);
            return;
        }
        if (speechSynthesisInstance.speaking) {
            // Option to stop current speech
            speechSynthesisInstance.cancel(); 
            // showStatus("మాట్లాడటం ఆపివేయబడింది.", "info");
            // updateSpeakButtonState(false); // Reset button if stopping
            // return;
        }

        updateSpeakButtonState(true); // Speaking state

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.value;
        
        if (selectedVoiceName) {
            utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
        }
        if (!utterance.voice || !utterance.voice.lang.startsWith('te')) {
             utterance.lang = 'te-IN'; // Default to Indian Telugu
        }
        
        utterance.onstart = () => showStatus("మాట్లాడటం ప్రారంభించబడింది...", "info");
        utterance.onend = () => {
            addToAppHistory(text);
            showStatus("మాట్లాడటం పూర్తయింది.", "success");
            updateSpeakButtonState(false); // Not speaking state
        };
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            let errorMsg = "క్షమించండి, ఒక లోపం సంభవించింది: " + event.error;
            // More specific error messages based on event.error
            if (event.error === 'network') errorMsg = "నెట్‌వర్క్ లోపం. కొన్ని వాయిస్‌లకు ఇంటర్నెట్ అవసరం కావచ్చు.";
            else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') errorMsg = "స్పీచ్ అనుమతించబడలేదు. బ్రౌజర్ సెట్టింగ్‌లను తనిఖీ చేయండి.";
            else if (event.error === 'language-unavailable' || event.error === 'voice-unavailable') errorMsg = "ఎంచుకున్న భాష లేదా వాయిస్ అందుబాటులో లేదు.";
            else if (event.error === 'synthesis-failed') errorMsg = "స్పీచ్ సింథసిస్ విఫలమైంది. మళ్లీ ప్రయత్నించండి.";
            else if (event.error === 'audio-busy') errorMsg = "ఆడియో సిస్టమ్ బిజీగా ఉంది. దయచేసి మళ్ళీ ప్రయత్నించండి.";
            else if (event.error === 'interrupted') { /* This can happen if we call cancel() */ return; }


            showStatus(errorMsg, "error");
            updateSpeakButtonState(false);
        };
        speechSynthesisInstance.speak(utterance);
    }
    
    function updateSpeakButtonState(isSpeaking) {
        speakButton.disabled = isSpeaking;
        if (isSpeaking) {
            speakButtonIcon.className = 'fas fa-spinner fa-spin';
            speakButtonText.textContent = 'మాట్లాడుతోంది...';
        } else {
            speakButtonIcon.className = 'fas fa-play';
            speakButtonText.textContent = 'మాట్లాడండి';
        }
    }

    function animateInputError(element) {
        motion(element, {
            x: [0, -5, 5, -5, 5, 0],
            borderColor: ["var(--border-color)", "var(--status-error-color)", "var(--border-color)"], // Assuming --status-error-color is defined
            transition: { duration: 0.4, ease: "easeInOut" }
        });
    }

    // --- History Management ---
    function addToAppHistory(text) {
        if (appHistory.includes(text)) { // Move existing to top
            appHistory = appHistory.filter(item => item !== text);
        }
        appHistory.unshift(text);
        if (appHistory.length > 20) { // Limit history size
            appHistory.pop();
        }
        localStorage.setItem('teluguTTSHistory_Ganesh', JSON.stringify(appHistory));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = ''; // Clear existing items
        if (appHistory.length === 0) {
            if(historyEmptyPlaceholder) historyList.appendChild(historyEmptyPlaceholder);
            clearHistoryButton.style.display = 'none';
            return;
        }

        clearHistoryButton.style.display = 'inline-flex'; // Show if history exists
        appHistory.forEach((text, index) => {
            const li = document.createElement('li');
            // Framer Motion for list items
            motion(li, { 
                initial: { opacity: 0, y: -10 }, 
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, x: -20}, // For AnimatePresence if used
                transition: { duration: 0.2, delay: index * 0.05 }
            });

            const textSpan = document.createElement('span');
            textSpan.className = 'history-text';
            textSpan.textContent = text;
            textSpan.title = "తిరిగి వినండి: " + text;
            textSpan.addEventListener('click', () => replayHistoryItem(text));

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = "ఈ అంశాన్ని తొలగించు";
            deleteBtn.setAttribute('aria-label', `Delete history item: ${text.substring(0,20)}`);
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(index);
            });
            // Apply Framer to history buttons too
            deleteBtn.addEventListener('mouseenter', () => motion(deleteBtn, { scale: 1.15, color: "var(--secondary-accent-color)"}, {duration: 0.1}));
            deleteBtn.addEventListener('mouseleave', () => motion(deleteBtn, { scale: 1, color: "var(--accent-color)"}, {duration: 0.1}));


            actionsDiv.appendChild(deleteBtn);
            li.appendChild(textSpan);
            li.appendChild(actionsDiv);
            historyList.appendChild(li);
        });
    }

    function replayHistoryItem(text) {
        textToSpeakInput.value = text;
        textToSpeakInput.focus();
        handleSpeak();
    }
    
    function deleteHistoryItem(index) {
        const itemText = appHistory[index];
        appHistory.splice(index, 1);
        localStorage.setItem('teluguTTSHistory_Ganesh', JSON.stringify(appHistory));
        renderHistory(); // Re-render with animation
        showStatus(`"${itemText.substring(0,20)}..." చరిత్ర నుండి తొలగించబడింది.`, "info");
    }

    function clearAppHistory() {
        if (appHistory.length === 0) return;
        // A more Apple-like confirmation would be a custom modal, but confirm is fine for simplicity
        if (confirm("మీరు మొత్తం చరిత్రను క్లియర్ చేయాలనుకుంటున్నారా? ఈ చర్యను వెనక్కి తీసుకోలేరు.")) {
            appHistory = [];
            localStorage.removeItem('teluguTTSHistory_Ganesh');
            renderHistory();
            showStatus("చరిత్ర క్లియర్ చేయబడింది.", "success");
        }
    }

    // --- Utility Functions ---
    let statusTimeout;
    function showStatus(message, type = "info", persistent = false) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`; // types: info, success, error
        
        clearTimeout(statusTimeout); // Clear existing timeout
        if (!persistent) {
            statusTimeout = setTimeout(() => {
                motion(statusMessage, {
                    opacity: 0,
                    transition: {duration: 0.3},
                    onComplete: () => {
                        statusMessage.textContent = '';
                        statusMessage.className = 'status-message';
                        statusMessage.style.opacity = 1; // Reset for next message
                    }
                });
            }, 4000);
        }
    }

    // Start the application
    try {
        initializeApp();
    } catch (error) {
        console.error("Application initialization failed:", error);
        // Display a user-friendly error message on the page itself
        const body = document.querySelector('body');
        if (splashScreen) splashScreen.style.display = 'none'; // Hide splash if error
        if (guidedTourModal) guidedTourModal.style.display = 'none';
        if (appContainer) appContainer.style.display = 'none';
        
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--accent-color);">
                <h2><i class="fas fa-exclamation-triangle"></i> అప్లికేషన్ లోడ్ చేయడంలో లోపం</h2>
                <p style="color: var(--text-color); margin-top: 10px;">క్షమించండి, అప్లికేషన్‌ను ప్రారంభించడంలో ఊహించని సమస్య ఏర్పడింది. దయచేసి పేజీని రిఫ్రెష్ చేయడానికి ప్రయత్నించండి లేదా తర్వాత మళ్లీ రండి.</p>
                <p style="font-size: 0.8em; color: #888; margin-top: 20px;">Error: ${error.message}</p>
            </div>
        `;
        body.appendChild(errorDiv);
    }
});
