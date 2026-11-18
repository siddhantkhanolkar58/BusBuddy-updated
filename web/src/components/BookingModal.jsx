import { useState } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_SEAT_MAP = [
  // 8 rows x 4 seats (2 on left, 2 on right)
  { id: '1A', status: 'available' }, { id: '1B', status: 'occupied' }, { id: '1C', status: 'available' }, { id: '1D', status: 'available' },
  { id: '2A', status: 'available' }, { id: '2B', status: 'available' }, { id: '2C', status: 'occupied' }, { id: '2D', status: 'occupied' },
  { id: '3A', status: 'available' }, { id: '3B', status: 'available' }, { id: '3C', status: 'available' }, { id: '3D', status: 'available' },
  { id: '4A', status: 'disabled' },  { id: '4B', status: 'available' }, { id: '4C', status: 'available' }, { id: '4D', status: 'available' },
  { id: '5A', status: 'available' }, { id: '5B', status: 'occupied' }, { id: '5C', status: 'available' }, { id: '5D', status: 'available' },
  { id: '6A', status: 'available' }, { id: '6B', status: 'available' }, { id: '6C', status: 'occupied' }, { id: '6D', status: 'available' },
  { id: '7A', status: 'available' }, { id: '7B', status: 'available' }, { id: '7C', status: 'available' }, { id: '7D', status: 'occupied' },
  { id: '8A', status: 'available' }, { id: '8B', status: 'available' }, { id: '8C', status: 'available' }, { id: '8D', status: 'available' },
];

export function BookingModal({ route, initialFrom = '', initialTo = '', onClose, onBooked }) {
  const [step, setStep] = useState(1); // 1: Seats, 2: Passenger, 3: Review, 4: Confirmed
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passenger, setPassenger] = useState({
    name: '',
    phone: '',
    email: '',
    pickup: initialFrom || (route?.stops?.[0]?.name ?? 'Origin Bus Stop'),
    dropoff: initialTo || (route?.stops?.[route?.stops?.length - 1]?.name ?? 'Destination Bus Stop'),
    date: new Date().toISOString().slice(0, 10),
  });
  const [bookingRef, setBookingRef] = useState(null);

  const FARE_PER_SEAT = 40;
  const totalFare = selectedSeats.length * FARE_PER_SEAT;

  const toggleSeat = (seatId, status) => {
    if (status === 'occupied' || status === 'disabled') return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= 6) {
        alert('You can select up to 6 seats per booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleConfirm = () => {
    const ref = `BB-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking = {
      id: ref,
      bookingRef: ref,
      routeId: route?.id,
      routeCode: route?.code || 'R1',
      routeName: route?.name || 'City Express',
      seats: selectedSeats,
      passenger,
      totalFare,
      bookedAt: new Date().toISOString(),
      status: 'confirmed',
    };

    // Save to localStorage for persistence
    try {
      const stored = JSON.parse(localStorage.getItem('busbuddy_bookings') || '[]');
      stored.unshift(newBooking);
      localStorage.setItem('busbuddy_bookings', JSON.stringify(stored));
    } catch (e) {
      console.warn('Could not persist booking to local storage', e);
    }

    setBookingRef(ref);
    setStep(4);
    if (onBooked) onBooked(newBooking);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 text-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white/20 px-2 py-0.5 font-mono text-xs font-bold text-white tracking-wider">
                {route?.code || 'EXPRESS'}
              </span>
              <h2 id="booking-title" className="text-base sm:text-lg font-bold tracking-tight">
                {step === 4 ? 'Booking Confirmed!' : `Reserve Seat · ${route?.name || 'Bus Service'}`}
              </h2>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              {step === 1 && 'Step 1 of 3: Select your seats'}
              {step === 2 && 'Step 2 of 3: Passenger details'}
              {step === 3 && 'Step 3 of 3: Fare summary & confirmation'}
              {step === 4 && `Boarding pass generated: Ref #${bookingRef}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition"
            aria-label="Close booking modal"
          >
            ×
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: SEAT SELECTION */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="size-4 rounded-md border-2 border-brand-500 bg-white" /> Available
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="size-4 rounded-md bg-amber-500 border border-amber-600" /> Selected
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="size-4 rounded-md bg-slate-700" /> Occupied
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="size-4 rounded-md bg-slate-200 border border-slate-300" /> Reserved
                </span>
              </div>

              {/* Bus Cabin Outline */}
              <div className="max-w-xs mx-auto p-4 rounded-3xl border-2 border-slate-300 bg-slate-50/50 shadow-inner">
                {/* Driver Cockpit */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-dashed border-slate-200 px-2 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <svg className="size-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Driver
                  </span>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">FRONT ENTRY</span>
                </div>

                {/* Seat Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 8 }).map((_, rowIndex) => {
                    const rowSeats = DEFAULT_SEAT_MAP.slice(rowIndex * 4, rowIndex * 4 + 4);
                    return (
                      <div key={rowIndex} className="contents">
                        {/* Seat A */}
                        <SeatButton
                          seat={rowSeats[0]}
                          isSelected={selectedSeats.includes(rowSeats[0]?.id)}
                          onClick={() => toggleSeat(rowSeats[0]?.id, rowSeats[0]?.status)}
                        />
                        {/* Seat B */}
                        <SeatButton
                          seat={rowSeats[1]}
                          isSelected={selectedSeats.includes(rowSeats[1]?.id)}
                          onClick={() => toggleSeat(rowSeats[1]?.id, rowSeats[1]?.status)}
                        />
                        {/* Aisle */}
                        <div className="flex items-center justify-center text-[10px] font-mono text-slate-300 select-none">
                          {rowIndex + 1}
                        </div>
                        {/* Seat C */}
                        <SeatButton
                          seat={rowSeats[2]}
                          isSelected={selectedSeats.includes(rowSeats[2]?.id)}
                          onClick={() => toggleSeat(rowSeats[2]?.id, rowSeats[2]?.status)}
                        />
                        {/* Seat D */}
                        <SeatButton
                          seat={rowSeats[3]}
                          isSelected={selectedSeats.includes(rowSeats[3]?.id)}
                          onClick={() => toggleSeat(rowSeats[3]?.id, rowSeats[3]?.status)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selection Summary Pill */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-50 border border-brand-200">
                <div>
                  <span className="text-xs font-semibold text-brand-900 block">
                    {selectedSeats.length ? `Selected Seats (${selectedSeats.length}):` : 'No seats chosen yet'}
                  </span>
                  <span className="text-sm font-bold text-brand-700">
                    {selectedSeats.length ? selectedSeats.join(', ') : 'Tap an open seat above to select'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-brand-900 block font-medium">Estimated Fare</span>
                  <span className="text-lg font-black text-brand-800">₹{totalFare}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PASSENGER DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-900">Selected Seats: <strong>{selectedSeats.join(', ')}</strong></span>
                <span className="font-bold text-brand-700">Total: ₹{totalFare}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="pname">Full Name *</label>
                  <input
                    id="pname"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kulkarni"
                    className="field"
                    value={passenger.name}
                    onChange={(e) => setPassenger({ ...passenger, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pphone">Mobile Phone *</label>
                  <input
                    id="pphone"
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    className="field"
                    value={passenger.phone}
                    onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pemail">Email Address</label>
                  <input
                    id="pemail"
                    type="email"
                    placeholder="name@example.com"
                    className="field"
                    value={passenger.email}
                    onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ppickup">Pickup Stop</label>
                  <input
                    id="ppickup"
                    type="text"
                    className="field"
                    value={passenger.pickup}
                    onChange={(e) => setPassenger({ ...passenger, pickup: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pdrop">Drop-off Stop</label>
                  <input
                    id="pdrop"
                    type="text"
                    className="field"
                    value={passenger.dropoff}
                    onChange={(e) => setPassenger({ ...passenger, dropoff: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PAYMENT SUMMARY */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Trip Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Route</span>
                    <strong className="text-slate-800 text-sm">{route?.code} · {route?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date</span>
                    <strong className="text-slate-800 text-sm">{passenger.date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Pickup</span>
                    <span className="text-slate-700 font-semibold">{passenger.pickup}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Drop-off</span>
                    <span className="text-slate-700 font-semibold">{passenger.dropoff}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Passenger</span>
                    <span className="text-slate-700 font-semibold">{passenger.name} ({passenger.phone})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Seat Numbers</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-bold">
                      {selectedSeats.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fare Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">Fare Breakdown</h4>
                <div className="flex justify-between text-slate-600">
                  <span>Base Fare ({selectedSeats.length} × ₹{FARE_PER_SEAT})</span>
                  <span className="font-mono">₹{totalFare}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Booking & Service Charge</span>
                  <span className="font-mono text-emerald-600 font-bold">FREE (₹0)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transport Safety Cess</span>
                  <span className="font-mono text-emerald-600 font-bold">FREE (₹0)</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                  <span>Total Amount Payable</span>
                  <span className="text-base text-brand-700">₹{totalFare}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BOARDING PASS & CONFIRMATION */}
          {step === 4 && (
            <div className="space-y-4 animate-rise">
              <div className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-900 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow">
                  CONFIRMED TICKET
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="size-8 rounded-xl bg-brand-600 text-white font-bold grid place-items-center text-sm shadow">
                    BB
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-400">BusBuddy Digital Pass</div>
                    <div className="font-mono text-xs font-bold text-brand-800">REF: {bookingRef}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed border-slate-200 my-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Passenger</span>
                    <strong className="text-slate-800 text-sm">{passenger.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Seats Assigned</span>
                    <strong className="text-brand-700 text-sm font-black">{selectedSeats.join(', ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Route</span>
                    <span className="font-semibold text-slate-800">{route?.code} · {route?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Boarding Stop</span>
                    <span className="font-semibold text-slate-800">{passenger.pickup}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Paid</span>
                    <span className="text-base font-black text-slate-900">₹{totalFare}</span>
                  </div>
                  {/* Simulated QR Code */}
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-300 bg-white shadow-sm">
                    <svg className="size-10 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-5 5h2v3h-2v-3zm3 0h3v3h-3v-3zm2-3h3v2h-3v-2zm-5-2h2v2h-2v-2z" />
                    </svg>
                    <span className="text-[9px] font-mono font-bold text-slate-500 tracking-tighter leading-none">
                      SCAN<br />AT BUS
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <svg className="size-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span>Ticket saved to <strong>My Saved Trips</strong>. Show this boarding pass when boarding.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn-ghost text-xs py-2 px-4"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={() => setStep(2)}
              className="btn-primary ml-auto py-2.5 px-6 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 border-0 shadow-md"
            >
              Continue with {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'} →
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              disabled={!passenger.name.trim() || !passenger.phone.trim()}
              onClick={() => setStep(3)}
              className="btn-primary py-2.5 px-6 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-900 border-0 shadow-md"
            >
              Proceed to Review →
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary py-2.5 px-6 text-sm font-bold bg-brand-700 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
            >
              Confirm Booking (Pay ₹{totalFare}) ✓
            </button>
          )}

          {step === 4 && (
            <div className="flex gap-2 w-full justify-end">
              <Link
                to="/saved"
                onClick={onClose}
                className="btn-ghost text-xs py-2 px-4"
              >
                View in My Bookings
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary py-2 px-5 text-xs font-bold bg-brand-700 text-white"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SeatButton({ seat, isSelected, onClick }) {
  if (!seat) return <div className="size-9" />;

  const isOccupied = seat.status === 'occupied';
  const isDisabled = seat.status === 'disabled';

  let classes = 'size-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all ';
  if (isSelected) {
    classes += 'bg-amber-500 text-slate-900 border-2 border-amber-600 shadow-md scale-105';
  } else if (isOccupied) {
    classes += 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-80';
  } else if (isDisabled) {
    classes += 'bg-slate-200 text-slate-400 border border-dashed border-slate-300 cursor-not-allowed';
  } else {
    classes += 'border-2 border-brand-300 bg-white text-brand-900 hover:border-brand-600 hover:bg-brand-50/50 hover:scale-105 active:scale-95 shadow-sm';
  }

  return (
    <button
      type="button"
      disabled={isOccupied || isDisabled}
      onClick={onClick}
      className={classes}
      title={`Seat ${seat.id} (${seat.status})`}
      aria-label={`Seat ${seat.id}: ${isSelected ? 'Selected' : seat.status}`}
    >
      {seat.id}
    </button>
  );
}

