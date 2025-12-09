document.addEventListener("DOMContentLoaded", () => {
  const micButton = document.getElementById("voice-mic-button");
  if (!micButton) return;

  let recording = false;
  let recognition;

  // Check if browser supports SpeechRecognition
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
      const command = event.results[0][0].transcript;
      console.log("Voice Command:", command);

      // Optional: send command to backend
      fetch("/apps/voice-processor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
    };

    recognition.onerror = function (e) {
      console.error("Speech recognition error:", e.error);
    };
  } else {
    console.warn("Speech recognition not supported in this browser.");
  }

  micButton.addEventListener("click", () => {
    if (!recognition) return;

    if (!recording) {
      recognition.start();
      micButton.classList.add("recording");
      recording = true;
    } else {
      recognition.stop();
      micButton.classList.remove("recording");
      recording = false;
    }
  });
});
