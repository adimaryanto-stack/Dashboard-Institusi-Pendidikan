'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseRealtime } from '@/lib/supabaseRealtime';
import { MessageCircle, Send, User, Trash2, Clock, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';

interface DiskusiMessage {
  id: string;
  nama_pengirim: string;
  pesan: string;
  created_at: string;
}

export default function DiskusiRAB() {
  const [messages, setMessages] = useState<DiskusiMessage[]>([]);
  const [namaPengirim, setNamaPengirim] = useState('');
  const [pesan, setPesan] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('diskusi_rab')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        setError(`Gagal memuat diskusi: ${fetchError.message}`);
        return;
      }

      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError('Tidak dapat terhubung ke server diskusi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchMessages();

    const channel = supabaseRealtime
      .channel('diskusi-rab-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'diskusi_rab',
        },
        (payload) => {
          const newMsg = payload.new as DiskusiMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'diskusi_rab',
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabaseRealtime.removeChannel(channel);
    };
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send a message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesan.trim()) return;

    setIsSending(true);
    const senderName = namaPengirim.trim() || 'Warga Anonim';

    const { error: insertError } = await supabase
      .from('diskusi_rab')
      .insert([
        {
          nama_pengirim: senderName,
          pesan: pesan.trim(),
        },
      ]);

    if (insertError) {
      console.error('Insert error:', insertError);
      setError(`Gagal mengirim: ${insertError.message}`);
    } else {
      setPesan('');
    }

    setIsSending(false);
  };

  // Delete a message
  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('diskusi_rab')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Get avatar color from name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200/60 p-4 flex items-center justify-between">
        <span className="text-sm font-bold text-text-primary flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <MessageSquare size={14} />
          </span>
          Diskusi RAB
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium">
            {messages.length} Komentar
          </span>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
            isConnected
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Nama Anda (Opsional, kosongkan untuk Anonim)"
              value={namaPengirim}
              onChange={(e) => setNamaPengirim(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted"
            />
          </div>
          <div className="relative">
            <textarea
              placeholder="Berikan komentar, pertanyaan, atau diskusi mengenai rencana anggaran ini..."
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted resize-none leading-relaxed"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!pesan.trim() || isSending}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                pesan.trim() && !isSending
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Kirim Komentar
            </button>
          </div>
        </form>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            {error}
            <button
              onClick={() => { setError(null); fetchMessages(); }}
              className="ml-auto text-rose-600 underline hover:text-rose-800 cursor-pointer text-[10px] font-bold"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Messages List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <Loader2 size={24} className="animate-spin text-blue-400 mb-2" />
              <span className="text-xs font-medium">Memuat diskusi...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <MessageCircle size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Belum ada diskusi</p>
              <p className="text-[10px] mt-0.5 text-text-muted">Jadilah yang pertama berkomentar mengenai rencana anggaran ini</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="group bg-white border border-slate-100 rounded-2xl p-4 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(msg.nama_pengirim)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                    {msg.nama_pengirim.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-text-primary">{msg.nama_pengirim}</span>
                      <span className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Clock size={10} />
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                      {msg.pesan}
                    </p>
                  </div>

                  {/* Delete button (Super Admin) */}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                    title="Hapus komentar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
