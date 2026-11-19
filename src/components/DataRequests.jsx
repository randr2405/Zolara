import { useState } from 'react'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { downloadExcel, downloadJson, exportUserData } from '../lib/dataExport.js'

const TYPE_LABEL = {
  access: 'Copy of my data',
  correction: 'Correct my data',
  deletion: 'Delete my account',
}

export default function DataRequests({ requests }) {
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function download(r, kind) {
    setBusyId(r.id)
    setError('')
    try {
      const data = await exportUserData(r.userId)
      if (kind === 'excel') await downloadExcel(`Zolara-data-${r.userId}.xlsx`, data)
      else downloadJson(`zolara-data-${r.userId}.json`, data)
    } catch (err) {
      console.error(err)
      setError('Could not export this user’s data. Check the console and your rules.')
    } finally {
      setBusyId('')
    }
  }

  async function finish(r) {
    const note = window.prompt('Mark this request as done. Note (optional):')
    if (note === null) return
    setBusyId(r.id)
    setError('')
    try {
      await updateDoc(doc(db, 'dataRequests', r.id), {
        status: 'done',
        adminNote: note.trim(),
        completedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Could not update the request.')
    } finally {
      setBusyId('')
    }
  }

  if (requests.length === 0) return <p className="text-sm">No data requests.</p>

  return (
    <>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <ul className="flex flex-col gap-3">
        {requests.map((r) => {
          const when = r.createdAt?.toDate?.().toLocaleDateString('en-ZA')
          return (
            <li key={r.id} className="rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{TYPE_LABEL[r.type]}</p>
                  <p className="text-sm">{r.userName} · {r.userEmail}</p>
                  <p className="text-xs text-gold-deep">{when} · user id {r.userId}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${
                  r.status === 'done' ? 'bg-cream' : 'bg-red-100 text-red-700'}`}>
                  {r.status === 'done' ? 'Done' : 'Open'}
                </span>
              </div>

              {r.message && <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>}
              {r.adminNote && <p className="mt-2 text-xs">Note: {r.adminNote}</p>}

              {r.type === 'deletion' && r.status !== 'done' && (
                <p className="mt-2 rounded-lg bg-cream p-3 text-xs">
                  To delete: confirm the person’s identity first. In the Firebase console, delete their
                  user under Authentication, then their documents in users, sellers, applications,
                  payoutDetails and sellerDecisions, and their listings. Keep bookings, orders, payouts
                  and the ledger for as long as the law requires you to keep financial records.
                </p>
              )}

              {r.status !== 'done' && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {r.type === 'access' && (
                    <>
                      <button disabled={busyId === r.id} onClick={() => download(r, 'excel')}
                        className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
                        Download data (Excel)
                      </button>
                      <button disabled={busyId === r.id} onClick={() => download(r, 'json')}
                        className="rounded-full border border-gold-deep px-4 py-2 text-sm text-gold-deep disabled:opacity-60">
                        Download data (JSON)
                      </button>
                    </>
                  )}
                  <button disabled={busyId === r.id} onClick={() => finish(r)}
                    className="rounded-full bg-emerald-brand px-4 py-2 text-sm text-cream disabled:opacity-60">
                    Mark as done
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}