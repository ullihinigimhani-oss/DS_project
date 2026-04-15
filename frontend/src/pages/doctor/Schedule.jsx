import StatusPill from '../../components/StatusPill'
import ModernSelect from '../../components/ModernSelect'
import DoctorPortalPage from './DoctorPortalPage'
import {
  dayLabels,
  formatScheduleType,
  formatTime,
  useDoctorPortal,
} from './DoctorPortalContext'

function ScheduleContent() {
  const {
    schedule,
    slotValues,
    scheduleSummary,
    scheduleByDay,
    sortedScheduleSlots,
    handleSlotChange,
    handleScheduleType,
    handleAddSlot,
    handleResetWeek,
    handleToggleSlot,
    handleDeleteSlot,
  } = useDoctorPortal()

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Schedule Planner</h3>
          <StatusPill
            status={scheduleSummary.available ? 'ok' : 'pending'}
            label={formatScheduleType(schedule?.schedule_type)}
          />
        </div>
        <p>
          Define when patients can book with you, switch between recurring and reset-week
          availability, and keep your slots clean before new requests arrive.
        </p>
        <div className="doctor-schedule-highlight-grid">
          <article className="doctor-schedule-highlight">
            <span>Active mode</span>
            <strong>{formatScheduleType(schedule?.schedule_type)}</strong>
            <p>
              {schedule?.schedule_type === 'reset'
                ? 'This schedule is managed week by week using a chosen Monday start date.'
                : 'Recurring slots repeat automatically and are best for stable clinic hours.'}
            </p>
          </article>
          <article className="doctor-schedule-highlight">
            <span>Open slots</span>
            <strong>{scheduleSummary.available}</strong>
            <p>Bookable availability patients can currently match against.</p>
          </article>
          <article className="doctor-schedule-highlight">
            <span>Paused slots</span>
            <strong>{scheduleSummary.unavailable}</strong>
            <p>Slots kept on the calendar but hidden from active booking.</p>
          </article>
          <article className="doctor-schedule-highlight">
            <span>Week scope</span>
            <strong>{schedule?.schedule_type === 'reset' ? slotValues.weekStart : 'Always on'}</strong>
            <p>
              {schedule?.schedule_type === 'reset'
                ? 'The selected week controls which one-off slots are visible and can be cleared.'
                : 'Recurring mode ignores week scope and uses the same pattern continuously.'}
            </p>
          </article>
        </div>
      </section>

      <div className="doctor-content-grid">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Availability Controls</h3>
            <span className="doctor-mini-badge">{scheduleSummary.total} slots configured</span>
          </div>
          <p>Choose how your availability behaves, then add the slot details below.</p>

          <div className="doctor-schedule-mode-row">
            <button
              type="button"
              className={`doctor-schedule-mode-button ${schedule?.schedule_type !== 'reset' ? 'active' : ''}`}
              onClick={() => handleScheduleType('recurring')}
            >
              Recurring hours
            </button>
            <button
              type="button"
              className={`doctor-schedule-mode-button ${schedule?.schedule_type === 'reset' ? 'active' : ''}`}
              onClick={() => handleScheduleType('reset')}
            >
              Weekly reset
            </button>
          </div>

          <form className="analysis-form" onSubmit={handleAddSlot}>
            <div className="doctor-inline-grid">
              <div className="doctor-compact-field">
                <span>Day</span>
                <ModernSelect
                  value={slotValues.dayOfWeek}
                  onChange={(event) => handleSlotChange({ target: { name: 'dayOfWeek', value: event.target.value } })}
                  options={dayLabels.map((label, index) => ({
                    value: String(index),
                    label: label,
                  }))}
                />
              </div>
              <label>
                Start
                <input name="startTime" type="time" value={slotValues.startTime} onChange={handleSlotChange} />
              </label>
              <label>
                End
                <input name="endTime" type="time" value={slotValues.endTime} onChange={handleSlotChange} />
              </label>
            </div>

            <label>
              Week start
              <input name="weekStart" type="date" value={slotValues.weekStart} onChange={handleSlotChange} />
            </label>

            {schedule?.schedule_type === 'reset' ? (
              <p className="doctor-help">
                Weekly reset mode uses the chosen Monday date to create one-off availability for a
                single week.
              </p>
            ) : (
              <p className="doctor-help">
                Recurring mode repeats these slot times every week, so the week field is only kept
                as reference.
              </p>
            )}

            <div className="doctor-toolbar">
              <button type="submit">Add slot</button>
              {schedule?.schedule_type === 'reset' ? (
                <button type="button" className="secondary-button" onClick={handleResetWeek}>
                  Clear selected week
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Weekly Slot Map</h3>
            <span className="doctor-mini-badge">{scheduleSummary.available} open</span>
          </div>
          <p>
            Review your availability by day so you can quickly spot empty days, overlaps, or paused
            time blocks.
          </p>

          <div className="doctor-schedule-day-grid">
            {scheduleByDay.map((day) => (
              <article key={day.label} className="doctor-schedule-day-card">
                <div className="doctor-schedule-day-header">
                  <strong>{day.label}</strong>
                  <span className="doctor-mini-badge">{day.slots.length}</span>
                </div>

                {day.slots.length ? (
                  <div className="doctor-schedule-slot-stack">
                    {day.slots.map((slot) => (
                      <div key={slot.id} className="doctor-schedule-slot-pill">
                        <span>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                        <StatusPill
                          status={slot.is_available ? 'ok' : 'warn'}
                          label={slot.is_available ? 'Open' : 'Paused'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="doctor-help">No slots added for this day yet.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Slot Management</h3>
          <span className="doctor-mini-badge">{scheduleSummary.total} total slots</span>
        </div>
        <p>Turn individual slots on or off, or delete the ones you no longer want patients to see.</p>

        <div className="doctor-list-stack">
          {sortedScheduleSlots.length ? (
            sortedScheduleSlots.map((slot) => (
              <article key={slot.id} className="doctor-list-card doctor-schedule-slot-card">
                <div className="doctor-slot-topline">
                  <div>
                    <strong>{dayLabels[slot.day_of_week] || `Day ${slot.day_of_week}`}</strong>
                    <p>
                      {formatTime(slot.start_time)} to {formatTime(slot.end_time)}
                    </p>
                  </div>
                  <StatusPill
                    status={slot.is_available ? 'ok' : 'warn'}
                    label={slot.is_available ? 'Available' : 'Unavailable'}
                  />
                </div>

                <div className="doctor-chip-row">
                  <span className="doctor-chip">
                    {slot.week_start ? `Week of ${slot.week_start}` : 'Recurring slot'}
                  </span>
                  <span className="doctor-chip">Slot ID #{String(slot.id).slice(0, 8)}</span>
                </div>

                <div className="doctor-toolbar">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleToggleSlot(slot.id, slot.is_available)}
                  >
                    {slot.is_available ? 'Mark unavailable' : 'Mark available'}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleDeleteSlot(slot.id)}>
                    Delete slot
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="doctor-empty-panel">
              <strong>No schedule slots have been added yet.</strong>
              <p>
                Start with a few clinic hours or telemedicine blocks so patients can begin booking
                into your dashboard flow.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Schedule(props) {
  return (
    <DoctorPortalPage {...props}>
      <ScheduleContent />
    </DoctorPortalPage>
  )
}
