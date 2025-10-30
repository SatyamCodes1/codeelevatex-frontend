// src/components/AIAssistant.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useUser } from '../context/UserContext';
import '../styles/AIAssistant.css';

interface Lesson {
  lessonId?: string;
  title?: string;
  type?: 'quiz' | 'coding' | 'explanation';
}

interface AIAssistantProps {
  currentLesson: Lesson;
  courseId: string;
}

type MessageType = 'user' | 'ai';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

// ✅ FIXED: Removed /api from base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AIAssistant: React.FC<AIAssistantProps> = ({ courseId, currentLesson }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user, token } = useUser();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: currentLesson
          ? `Hi ${user?.name || 'there'}! I'm here to help you with "${currentLesson.title}". What would you like to know?`
          : `Hi ${user?.name || 'there'}! I'm your AI learning assistant. How can I help you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, currentLesson, user, messages.length]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // ✅ FIXED: Added /api prefix
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: question,
          context: {
            courseId,
            lessonId: currentLesson?.lessonId,
            lessonTitle: currentLesson?.title,
            lessonType: currentLesson?.type,
          },
        }),
      });

      let aiResponse: string;
      if (response.ok) {
        const data = await response.json();
        aiResponse = data.response;
      } else {
        aiResponse = await generateMockResponse(question, currentLesson);
      }

      setIsTyping(false);

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI request failed:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        type: 'ai',
        content:
          "I'm having trouble connecting right now. Please try again in a moment, or feel free to ask your question in the comments section below!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResponse = async (question: string, lesson?: Lesson): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const responses: Record<string, string[]> = {
      quiz: [
        'For quiz questions, remember to read each option carefully.',
        'Eliminate the options you know are wrong first.',
        "Practice makes perfect! Don't worry if you don't get everything right on the first try.",
      ],
      coding: [
        'Understand the problem statement clearly and break it down into smaller steps.',
        'Test your code with examples before submitting!',
        'Write the logic in plain English first, then convert it to code if stuck.',
      ],
      explanation: [
        'This topic can be tricky, but it gets easier with practice.',
        'Check the examples in the Examples tab - they help clarify concepts.',
        'Ask more specific questions if something does not make sense!',
      ],
    };

    const defaultResponses = [
      "That's a great question! Let me help you understand this better.",
      "I'm here to help you learn! Could you be more specific?",
      "Learning can be challenging, but you're doing great! What specifically can I help clarify?",
      "Don't hesitate to ask questions - that's how we learn best!",
    ];

    const typeResponses = lesson?.type ? responses[lesson.type] || defaultResponses : defaultResponses;
    const randomResponse = typeResponses[Math.floor(Math.random() * typeResponses.length)];

    if (lesson?.title) {
      return `${randomResponse}\n\nSince you're working on "${lesson.title}", I can help with concepts, provide hints, or clarify confusing parts. What specific aspect would you like to discuss?`;
    }

    return randomResponse;
  };

  const clearChat = () => setMessages([]);
  const toggleChat = () => setIsOpen(prev => !prev);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`ai-button ${isOpen ? 'rotate' : ''}`}
        aria-label="AI Assistant"
      >
        {isOpen ? (
          <svg className="ai-button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="ai-button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div ref={containerRef} className="ai-container">
          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-logo">
                <svg className="ai-logo-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div>
                <h3 className="ai-header-title">AI Learning Assistant</h3>
                <p className="ai-header-subtitle">Always here to help</p>
              </div>
            </div>
            <div className="ai-header-actions">
              <button onClick={clearChat} className="ai-action-button" title="Clear chat">
                <svg className="ai-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button onClick={toggleChat} className="ai-action-button" title="Close chat">
                <svg className="ai-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.map(message => (
              <div key={message.id} className={`ai-message ${message.type === 'user' ? 'user' : 'ai'}`}>
                <div className="ai-message-content">
                  <p className="ai-message-text">{message.content}</p>
                  <p className={`ai-message-time ${message.type === 'user' ? 'user-time' : 'ai-time'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-message ai-typing">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="ai-input-form">
            <div className="ai-input-wrapper">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={currentLesson ? `Ask about ${currentLesson.title}...` : 'Ask me anything...'}
                className="ai-input"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !inputText.trim()} className="ai-send-button">
                {isLoading ? (
                  <svg className="loading-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
