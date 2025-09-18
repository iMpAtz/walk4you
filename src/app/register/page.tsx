'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const start = now - 100;
    return Array.from({ length: 101 }, (_, i) => String(start + i));
  }, []);

  const months = [
    { v: '01', t: '01' },
    { v: '02', t: '02' },
    { v: '03', t: '03' },
    { v: '04', t: '04' },
    { v: '05', t: '05' },
    { v: '06', t: '06' },
    { v: '07', t: '07' },
    { v: '08', t: '08' },
    { v: '09', t: '09' },
    { v: '10', t: '10' },
    { v: '11', t: '11' },
    { v: '12', t: '12' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert('Password และ Confirm Password ไม่ตรงกัน');
      return;
    }
    const birth = day && month && year ? `${year}-${month}-${day}` : undefined;
    console.log('Register submit', { fullName, username, password: '•••', email, gender, birth });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[680px] px-6 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/" aria-label="Back" className="text-2xl leading-none">←</Link>
          <h1 className="mx-auto text-center text-lg font-medium">Registration From</h1>
        </div>

        <div className="flex justify-center py-2">
          <div className="h-24 w-24 rounded-full bg-black" />
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700">Full Name</label>
            <input
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Username</label>
            <input
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Password</label>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">Birth Day</label>
              <div className="flex gap-2">
                <select value={day} onChange={(e) => setDay(e.target.value)} className="w-20 rounded border border-gray-200 bg-white px-2 py-2 text-sm">
                  <option value="">DD</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-20 rounded border border-gray-200 bg-white px-2 py-2 text-sm">
                  <option value="">MM</option>
                  {months.map((m) => (
                    <option key={m.v} value={m.v}>{m.t}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-28 rounded border border-gray-200 bg-white px-2 py-2 text-sm">
                  <option value="">YYYY</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="rounded bg-[#ff6b6b] px-8 py-2 text-white shadow hover:brightness-95"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


