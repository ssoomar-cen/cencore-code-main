import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLocation } from 'react-router-dom';

interface CommandHistory {
  id: string;
  command: string;
  response: string;
  success: boolean;
  timestamp: Date;
}

export function VoiceAssistant() {
  const location = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Extract current context from URL
  const getCurrentContext = () => {
    const path = location.pathname;
    
    // Match patterns like /crm/accounts/[id], /crm/contacts/[id], etc.
    const match = path.match(/\/crm\/(accounts|contacts|leads|opportunities|cases|quotes|contracts|activities|projects)\/([^/]+)/);
    
    if (match) {
      const entityType = match[1];
      const recordId = match[2];
      
      // Map plural route names to singular entity types
      const entityMap: Record<string, string> = {
        'accounts': 'account',
        'contacts': 'contact',
        'leads': 'lead',
        'opportunities': 'opportunity',
        'cases': 'case',
        'quotes': 'quote',
        'contracts': 'contract',
        'activities': 'activity',
        'projects': 'project'
      };
      
      return {
        entityType: entityMap[entityType] || entityType,
        recordId
      };
    }
    
    return null;
  };

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Voice recognition started');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Recognized:', transcript);
        setCommand(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable microphone permissions.');
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Web Speech API not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    try {
      setIsListening(true);
      recognitionRef.current.start();
      toast.info('Listening... Speak your command');
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      toast.error('Failed to start voice recognition');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processCommand = async () => {
    if (!command.trim()) {
      toast.error('Please enter or speak a command');
      return;
    }

    setIsProcessing(true);

    try {
      const context = getCurrentContext();
      
      const { data, error } = await supabase.functions.invoke('natural-language-update', {
        body: { 
          command: command.trim(),
          context: context ? {
            entityType: context.entityType,
            recordId: context.recordId
          } : null
        }
      });

      if (error) throw error;

      const newHistoryItem: CommandHistory = {
        id: Date.now().toString(),
        command: command.trim(),
        response: data.message || 'Command processed',
        success: data.success,
        timestamp: new Date()
      };

      setHistory(prev => [newHistoryItem, ...prev]);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }

      setCommand('');
    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process command';
      
      toast.error(errorMessage);
      
      const errorHistoryItem: CommandHistory = {
        id: Date.now().toString(),
        command: command.trim(),
        response: errorMessage,
        success: false,
        timestamp: new Date()
      };
      
      setHistory(prev => [errorHistoryItem, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processCommand();
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-2 sm:py-3">
        {/* Compact bar with expand/collapse */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                getCurrentContext() 
                  ? "Update status, delete, create..." 
                  : "Type command..."
              }
              disabled={isListening || isProcessing}
              className="h-10 min-w-0 flex-1"
            />
            
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className="h-10 w-10 shrink-0"
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={processCommand}
              disabled={!command.trim() || isProcessing || isListening}
              className="h-10 w-10 shrink-0"
              title="Send command"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" title={isExpanded ? "Hide history" : "Show examples & history"}>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Expanded content */}
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Examples */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Quick Examples:</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const context = getCurrentContext();
                  const examples = context
                    ? [
                        'update status to active',
                        'mark as lost',
                        'delete this record',
                        'set priority to high',
                      ]
                    : [
                        'close case 123',
                        'mark opportunity as lost',
                        'update lead status to qualified',
                        'create new task for project alpha',
                      ];
                  return examples;
                })().map((example) => (
                  <button
                    key={example}
                    onClick={() => setCommand(example)}
                    className="px-2 sm:px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-xs transition-colors whitespace-nowrap"
                    disabled={isProcessing}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent Commands:</p>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No commands yet</p>
                  ) : (
                    history.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className={`text-xs p-2 rounded border ${
                          item.success
                            ? "bg-success/10 border-success/20"
                            : "bg-destructive/10 border-destructive/20"
                        }`}
                      >
                        <p className="font-medium break-words">{item.command}</p>
                        <p className={`break-words ${item.success ? "text-success" : "text-destructive"}`}>
                          {item.response}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
