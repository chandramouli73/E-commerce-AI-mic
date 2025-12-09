import {
  render,
  useState,
  useExtensionApi
} from "@shopify/ui-extensions-react/checkout";

render("CustomerAccount::App::Render", () => <VoiceCommandWidget />);

function VoiceCommandWidget() {
  const api = useExtensionApi();
  const [recording, setRecording] = useState(false);
  const [commands, setCommands] = useState([]);

  // Web Speech API recognition setup
  let recognition;

  if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const voiceCommand = event.results[0][0].transcript;
      setCommands((prev) => [...prev, voiceCommand]);

      // TODO: Send stored commands to your backend
      console.log("Voice Command:", voiceCommand);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };
  }

  const toggleRecording = () => {
    if (!recognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    if (recording) {
      recognition.stop();
      setRecording(false);
    } else {
      recognition.start();
      setRecording(true);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 999999,
      }}
    >
      <button
        onClick={toggleRecording}
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: recording ? "#ff5252" : "#4CAF50",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        🎤
      </button>
    </div>
  );
}
