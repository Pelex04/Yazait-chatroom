/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useRef } from "react";
import { Mic, Square, Play, Pause, Trash2, Send } from "lucide-react";

/** ✅ Static waveform heights (module scope, pure) */
const WAVEFORM_HEIGHTS = [
  30, 50, 45, 60, 40,
  55, 35, 65, 42, 58,
  38, 62, 47, 53, 41,
  59, 36, 64, 44, 52,
];

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({
  onSend,
  onCancel,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** ✅ Starts recording ONLY from user action */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      
      alert("Microphone permission required.");
      onCancel();
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) onSend(audioBlob, recordingTime);
  };

  const handleDelete = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    onCancel();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Voice Message
        </h3>

        <div className="flex items-center justify-center gap-1 h-20 mb-4">
          {isRecording ? (
            <>
              {WAVEFORM_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full animate-pulse"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full"
            >
              <Mic className="text-blue-600" size={32} />
            </button>
          )}
        </div>

        <div className="text-center text-2xl font-mono font-bold text-gray-700 mb-6">
          {formatTime(recordingTime)}
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full"
            >
              <Square size={20} fill="currentColor" />
              Stop
            </button>
          ) : audioURL ? (
            <>
              <button
                onClick={handleDelete}
                className="px-4 py-3 bg-gray-200 rounded-full"
              >
                <Trash2 size={20} />
              </button>

              <button
                onClick={togglePlayPause}
                className="px-6 py-3 bg-blue-500 text-white rounded-full"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <button
                onClick={handleSend}
                className="px-6 py-3 bg-green-500 text-white rounded-full"
              >
                <Send size={20} />
              </button>
            </>
          ) : null}
        </div>

        <button
          onClick={handleDelete}
          className="w-full py-2 text-gray-500"
        >
          Cancel
        </button>

        {audioURL && (
          <audio
            ref={audioRef}
            src={audioURL}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
}
