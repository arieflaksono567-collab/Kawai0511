import React, { useState, useEffect } from 'react';
import { OrderDetails, Driver, ChatMessage } from '../types';
import { SosModal } from './SosModal';
import { NavigationModal } from './NavigationModal';
import {
  Phone,
  MessageSquare,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  X,
  Send,
  AlertCircle,
  ThumbsUp,
  Receipt,
  Bike,
  Siren,
  ExternalLink
} from 'lucide-react';

interface ActiveOrderTrackerProps {
  order: OrderDetails;
  onUpdateStatus: (orderId: string, newStatus: OrderDetails['status']) => void;
  onCancelOrder: (orderId: string) => void;
  onFinishOrder: (orderId: string, rating: number, tip: number) => void;
}

export const ActiveOrderTracker: React.FC<ActiveOrderTrackerProps> = ({
  order,
  onUpdateStatus,
  onCancelOrder,
  onFinishOrder,
}) => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [navTarget, setNavTarget] = useState<{ name: string; address: string } | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'driver',
      text: 'Halo kak, pesanan sudah saya terima. Saya langsung menuju titik jemput ya!',
      time: 'Baru saja',
    },
  ]);
  const [inputChat, setInputChat] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedTip, setSelectedTip] = useState<number>(2000);
  const [isRatingSubmitted, setIsRatingSubmitted] = useState<boolean>(false);

  // Auto-progress simulation for demo interactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (order.status === 'searching') {
      timer = setTimeout(() => {
        onUpdateStatus(order.id, 'accepted');
      }, 3500);
    } else if (order.status === 'accepted') {
      timer = setTimeout(() => {
        onUpdateStatus(order.id, 'heading_to_pickup');
      }, 3000);
    } else if (order.status === 'heading_to_pickup') {
      timer = setTimeout(() => {
        onUpdateStatus(order.id, 'arrived_pickup');
      }, 4000);
    } else if (order.status === 'arrived_pickup') {
      timer = setTimeout(() => {
        onUpdateStatus(order.id, 'on_the_way');
      }, 3500);
    } else if (order.status === 'on_the_way') {
      timer = setTimeout(() => {
        onUpdateStatus(order.id, 'completed');
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [order.status, order.id, onUpdateStatus]);

  const sendUserChat = () => {
    if (!inputChat.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputChat.trim(),
      time: 'Baru saja',
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setInputChat('');

    setTimeout(() => {
      const driverReplies = [
        'Siap kak, ditunggu di depan pagar ya!',
        'Oke kak, saya sudah di dekat belokan jalan utama.',
        'Baik kak, terima kasih informasinya!',
      ];
      const randomReply = driverReplies[Math.floor(Math.random() * driverReplies.length)];
      setChatMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: 'driver',
          text: randomReply,
          time: 'Baru saja',
        },
      ]);
    }, 1200);
  };

  const getStatusBanner = () => {
    switch (order.status) {
      case 'searching':
        return {
          title: 'Mencari Driver Kawai Terdekat...',
          desc: 'Menghubungkan ke mitra ojek & kurir di sekitar Banjarmasin Tengah',
          color: 'bg-amber-500',
        };
      case 'accepted':
      case 'heading_to_pickup':
        return {
          title: 'Driver Dalam Perjalanan Menuju Lokasi',
          desc: 'Estimasi tiba dalam 3-5 menit. Siapkan barang atau tunggu di lokasi jemput.',
          color: 'bg-sky-600',
        };
      case 'arrived_pickup':
        return {
          title: 'Driver Sudah Tiba di Lokasi Jemput!',
          desc: 'Driver menunggu di titik penjemputan / resto. Silakan temui driver.',
          color: 'bg-emerald-600',
        };
      case 'on_the_way':
        return {
          title: 'Dalam Perjalanan Menuju Alamat Tujuan',
          desc: 'Perjalanan aman dengan helm standar SNI & protokol keselamatan Kawai 0511.',
          color: 'bg-red-600',
        };
      case 'completed':
        return {
          title: 'Pesanan Selesai!',
          desc: 'Terima kasih telah menggunakan Kawai 0511. Semoga perjalanan menyenangkan!',
          color: 'bg-slate-900',
        };
      default:
        return {
          title: 'Pesanan Aktif',
          desc: 'Status pesanan sedang diproses.',
          color: 'bg-slate-700',
        };
    }
  };

  const banner = getStatusBanner();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg space-y-0">
      {/* Top Status Ribbon */}
      <div className={`${banner.color} text-white p-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {order.status === 'searching' ? (
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : order.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          ) : (
            <Bike className="w-5 h-5 animate-pulse" />
          )}
          <div>
            <h3 className="font-bold text-sm tracking-tight">{banner.title}</h3>
            <p className="text-[11px] text-white/80 line-clamp-1">{banner.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SOS Help Trigger */}
          {order.status !== 'completed' && order.status !== 'searching' && (
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow border border-red-500 animate-pulse"
              title="Pusat Bantuan & SOS Darurat"
            >
              <Siren className="w-3 h-3 text-white" />
              <span>SOS</span>
            </button>
          )}

          {/* Quick Stepper Status Badge */}
          <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded text-white font-semibold">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Driver Profile Card */}
        {order.driver && order.status !== 'searching' && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={order.driver.photoUrl}
                  alt={order.driver.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-red-500 shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-900">{order.driver.name}</h4>
                  <div className="flex items-center text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{order.driver.rating}</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700">{order.driver.vehicle}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">
                    {order.driver.plateNumber}
                  </span>
                  <span>· {order.driver.totalTrips} order</span>
                </div>
              </div>
            </div>

            {/* Contact Driver Actions */}
            {order.status !== 'completed' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-sky-600 hover:bg-sky-50 flex items-center justify-center shadow-sm relative transition-colors"
                  title="Chat Driver"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                </button>
                <a
                  href={`tel:${order.driver.phone}`}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shadow-sm transition-colors"
                  title="Telepon Driver"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Route Details with Direct Navigation Buttons */}
        <div className="space-y-2 text-xs">
          {/* Pickup row */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-slate-800 block truncate">
                  {order.service === 'food' ? 'Resto: ' : 'Jemput: '}
                  {order.pickup.name}
                </span>
                <p className="text-slate-400 text-[11px] truncate">{order.pickup.address}</p>
              </div>
            </div>

            {/* Google Maps direct button */}
            <button
              type="button"
              onClick={() => setNavTarget({ name: order.pickup.name, address: order.pickup.address })}
              className="px-2 py-1 rounded-lg bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1a73e8] text-[10px] font-bold flex items-center gap-1 border border-[#4285F4]/30 shrink-0"
              title="Buka Navigasi Titik Jemput di Google Maps"
            >
              <svg className="w-3 h-3 fill-[#1a73e8]" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>Navigasi</span>
            </button>
          </div>

          {/* Destination row */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
              <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                <Navigation className="w-2.5 h-2.5" />
              </div>
              <div className="truncate">
                <span className="font-semibold text-slate-800 block truncate">
                  Tujuan: {order.destination.name}
                </span>
                <p className="text-slate-400 text-[11px] truncate">{order.destination.address}</p>
              </div>
            </div>

            {/* Google Maps direct button */}
            <button
              type="button"
              onClick={() =>
                setNavTarget({ name: order.destination.name, address: order.destination.address })
              }
              className="px-2 py-1 rounded-lg bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1a73e8] text-[10px] font-bold flex items-center gap-1 border border-[#4285F4]/30 shrink-0"
              title="Buka Navigasi Alamat Tujuan di Google Maps"
            >
              <svg className="w-3 h-3 fill-[#1a73e8]" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>Navigasi</span>
            </button>
          </div>
        </div>

        {/* Service Details */}
        {order.packageDetails && (
          <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-100 text-xs text-sky-900">
            <p className="font-semibold">
              Paket: {order.packageDetails.type} ({order.packageDetails.weight})
            </p>
            <p className="text-[11px] text-sky-700">
              Penerima: {order.packageDetails.recipientName} ({order.packageDetails.recipientPhone})
            </p>
            {order.packageDetails.notes && (
              <p className="text-[11px] text-sky-600 italic mt-0.5">"{order.packageDetails.notes}"</p>
            )}
          </div>
        )}

        {order.foodItems && (
          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Pesanan Makanan:</p>
            {order.foodItems.map((fi) => (
              <div key={fi.menuItem.id} className="flex justify-between text-[11px]">
                <span>
                  {fi.quantity}x {fi.menuItem.name}
                </span>
                <span className="font-mono">
                  Rp {(fi.menuItem.price * fi.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}

        {order.shoppingItems && (
          <div className="bg-cyan-50 p-2.5 rounded-lg border border-cyan-100 text-xs text-cyan-900 space-y-1">
            <p className="font-semibold">Daftar Titip Belanja ({order.shoppingItems.length} item):</p>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-cyan-800">
              {order.shoppingItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Payment Summary */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Metode Bayar:</span>
            <span className="ml-1 font-semibold uppercase text-slate-800">
              {order.paymentMethod === 'kawaipay' ? 'KawaiPay' : 'Tunai'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Total Tarif:</span>
            <span className="ml-1 font-bold text-red-600 font-mono text-sm">
              Rp {order.totalPay.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2">
          {order.status === 'searching' && (
            <button
              type="button"
              onClick={() => onCancelOrder(order.id)}
              className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Batalkan Pencarian
            </button>
          )}

          {order.status !== 'searching' && order.status !== 'completed' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Simulasi Selesai Langsung
              </button>
              <button
                type="button"
                onClick={() => onCancelOrder(order.id)}
                className="px-3 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium"
              >
                Batalkan
              </button>
            </div>
          )}

          {/* Review & Tip when completed */}
          {order.status === 'completed' && !isRatingSubmitted && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="text-center">
                <h4 className="font-bold text-xs text-slate-900">Beri Nilai Driver</h4>
                <p className="text-[11px] text-slate-500">Bagaimana pelayanan Pak {order.driver?.name}?</p>
              </div>

              {/* Star Rating */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= selectedRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Tip Selection */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-700">Kirim Tip Driver (Opsional):</span>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                  {[0, 2000, 5000, 10000].map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => setSelectedTip(tip)}
                      className={`py-1 rounded border text-[11px] font-bold ${
                        selectedTip === tip
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {tip === 0 ? 'Nol' : `+${tip / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRatingSubmitted(true);
                  onFinishOrder(order.id, selectedRating, selectedTip);
                }}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Kirim Penilaian & Selesai
              </button>
            </div>
          )}

          {isRatingSubmitted && (
            <div className="text-center py-2 text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Terima kasih! Ulasan kamu telah tersimpan.</span>
            </div>
          )}
        </div>
      </div>

      {/* In-App Live Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl h-[480px] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <img
                  src={order.driver?.photoUrl}
                  alt="Driver"
                  className="w-8 h-8 rounded-full object-cover border border-white"
                />
                <div>
                  <h4 className="font-bold text-xs">{order.driver?.name}</h4>
                  <p className="text-[10px] text-emerald-400">Online · Kawai 0511 Messenger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2.5 bg-slate-50 text-xs">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              {['Saya tunggu di depan ya', 'Sesuai titik di peta', 'Hati-hati di jalan pak'].map(
                (quick, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputChat(quick);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full whitespace-nowrap"
                  >
                    {quick}
                  </button>
                )
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Tulis pesan ke driver..."
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendUserChat()}
                className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={sendUserChat}
                className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        driverName={order.driver?.name}
        currentLocationName={order.pickup.name}
      />

      {/* Navigation Modal */}
      {navTarget && (
        <NavigationModal
          isOpen={!!navTarget}
          onClose={() => setNavTarget(null)}
          destinationName={navTarget.name}
          destinationAddress={navTarget.address}
        />
      )}
    </div>
  );
};
