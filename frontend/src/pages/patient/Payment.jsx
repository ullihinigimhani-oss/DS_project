import { useEffect, useMemo, useState } from 'react'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'

const stripePromise = loadStripe("pk_test_51TLRtcBiXAUe5p1fRzmD6mQaXFsJoEd8QCHUWxhjgcXVoNluCN7MaCSfaBzVosNY4dMmU5kTImQwjvz07ft3l4GX009QiUFjB8")

function PaymentForm({ onNavigate }) {
  const stripe = useStripe()
  const elements = useElements()
  const {
    pendingPaymentBooking,
    handleCreatePaymentIntent,
    handleConfirmPaymentAndBooking,
    session,
    isConnectedPatient,
  } = usePatientPortal()

  const [clientSecret, setClientSecret] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const createIntent = async () => {
      if (!pendingPaymentBooking?.appointmentId) {
        setError('No appointment found for payment.')
        return
      }

      if (!isConnectedPatient || !session?.token) {
        setError('Please sign in to complete payment.')
        return
      }

      setBusy(true)
      setError('')
      try {
        const paymentData = await handleCreatePaymentIntent()
        setClientSecret(paymentData.clientSecret || '')
        setPaymentId(paymentData.payment?.id || '')
      } catch (paymentError) {
        console.error('Payment intent creation error:', paymentError)
        if (paymentError.message?.includes('401') || paymentError.message?.includes('token') || paymentError.message?.includes('unauthorized')) {
          setError('Session expired. Please sign out and sign in again.')
        } else {
          setError(paymentError.message || 'Payment setup failed. Please try again.')
        }
      } finally {
        setBusy(false)
      }
    }

    createIntent()
  }, [pendingPaymentBooking?.appointmentId, isConnectedPatient, session?.token])

  const appointmentAmount = useMemo(
    () => Number(pendingPaymentBooking?.amount || 0).toFixed(2),
    [pendingPaymentBooking?.amount],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements || !clientSecret) return

    setBusy(true)
    setError('')
    setMessage('')

    const card = elements.getElement(CardElement)
    if (!card) {
      setBusy(false)
      setError('Payment card form is not ready.')
      return
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })

    if (result.error) {
      setBusy(false)
      setError(result.error.message || 'Payment failed. Try another card.')
      return
    }

    try {
      await handleConfirmPaymentAndBooking({
        paymentId,
        transactionId: result.paymentIntent?.id,
      })
      setMessage('Payment completed successfully! Redirecting to your appointments...')
      setTimeout(() => {
        onNavigate('/patient/my-bookings')
      }, 2000)
    } catch (confirmError) {
      console.error('Payment confirmation error:', confirmError)
      setError(confirmError.message || 'Payment confirmation failed. Please contact support.')
    } finally {
      setBusy(false)
    }
  }

  if (!pendingPaymentBooking) {
    return (
      <div className="patient-page-stack">
        <section className="patient-surface-card">
          <h3>Payment</h3>
          <p className="empty-state">No pending appointment payment found.</p>
          <button type="button" onClick={() => onNavigate('/patient/book-appointment')}>
            Back to booking
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <h3>Complete appointment payment</h3>
        <p>
          {pendingPaymentBooking.doctorName} | {formatDate(pendingPaymentBooking.appointmentDate)} |{' '}
          {formatTime(pendingPaymentBooking.startTime)} - {formatTime(pendingPaymentBooking.endTime)}
        </p>
        <p>Total amount: ${appointmentAmount}</p>
        <form onSubmit={handleSubmit} className="patient-booking-form">
          <label className="patient-field">
            Card details
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <CardElement />
            </div>
          </label>
          <button type="submit" disabled={busy || !stripe || !clientSecret}>
            {busy ? 'Processing...' : 'Pay now'}
          </button>
        </form>
        {error ? <p className="empty-state">{error}</p> : null}
        {message ? <p className="empty-state">{message}</p> : null}
      </section>
    </div>
  )
}

export default function PatientPayment(props) {
  return (
    <PatientPortalPage {...props}>
      <Elements stripe={stripePromise}>
        <PaymentForm onNavigate={props.onNavigate} />
      </Elements>
    </PatientPortalPage>
  )
}
