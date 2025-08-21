
import React, { useState } from 'react';
import { AppState } from '../types';

interface UserInputProps {
  onSubmit: (text: string) => void;
  disabled: boolean;
  appState: AppState;
}

const getPlaceholderText = (appState: AppState): string => {
    switch (appState) {
        case AppState.INITIAL_PROMPT:
            return 'Beschreibe deine Prompt-Idee...';
        case AppState.ASKING_QUESTIONS:
            return 'Beantworte die Frage...';
        case AppState.FEEDBACK:
            return 'Antworte mit "Ja" oder "Nein"...';
        case AppState.REFINING:
            return 'Was möchtest du ändern?';
        case AppState.AWAITING_NEURO_MEDIA_CHOICE:
            return 'Antworte mit "Ja" oder "Nein"...';
        case AppState.AWAITING_RESTART:
            return 'Antworte mit "Ja" oder "Nein"...';
        case AppState.DONE:
            return 'Der Prozess ist abgeschlossen.';
        default:
            return 'Tippe eine Nachricht...';
    }
};

export const UserInput: React.FC<UserInputProps> = ({ onSubmit, disabled, appState }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholderText(appState)}
        disabled={disabled}
        rows={1}
        className="flex-1 p-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none disabled:opacity-50 transition-all duration-200"
      />
      <button
        type="submit"
        disabled={disabled || !inputValue.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold p-3 rounded-lg transition-colors duration-200 flex items-center justify-center h-[50px] w-[50px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </form>
  );
};