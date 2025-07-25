document.addEventListener('DOMContentLoaded', () => {
    // --- NUEVAS CONSTANTES ---
    const consultationTypeSelect = document.getElementById('consultation-type-select');

    // --- CONSTANTES EXISTENTES ---
    const calendarGrid = document.getElementById('calendar-grid');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const appointmentModal = document.getElementById('appointment-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalDoctorName = document.getElementById('modal-doctor-name');
    const modalDate = document.getElementById('modal-date');
    const modalTime = document.getElementById('modal-time');
    const patientNameInput = document.getElementById('patient-name');
    const patientPhoneInput = document.getElementById('patient-phone');
    const patientEmailInput = document.getElementById('patient-email');
    const phoneValidationMessage = document.getElementById('phone-validation-message');
    const confirmAppointmentBtn = document.getElementById('confirm-appointment-btn');
    const appointmentForm = document.getElementById('appointment-form');
    const doctorSelect = document.getElementById('doctor-select');

    let currentWeekStart = new Date();
    let selectedSlot = null;
    let bookedAppointments = {};

    // --- FUNCIONES DE FECHA (Sin cambios) ---
    const formatDate = (date) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    };
    const formatShortDate = (date) => {
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };
    const getWeekRange = (date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    };

    // --- FUNCIÓN MODIFICADA: generateTimeSlots ---
    const generateTimeSlots = (durationMinutes) => {
        const slots = [];
        const interval = parseInt(durationMinutes);
        // Horario de 8:00 (8) a 20:00 (8 PM)
        for (let h = 8; h < 20; h++) {
            if (h === 14) continue; // Mantenemos el bloqueo de las 2 PM para la comida
            for (let m = 0; m < 60; m += interval) {
                // Prevenir que se generen slots que terminen después de las 8 PM
                if (h === 19 && (m + interval) > 60) continue;
                
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // --- FUNCIÓN populateMonthYearDropdowns (Sin cambios) ---
    const populateMonthYearDropdowns = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        monthSelect.innerHTML = '';
        monthNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            if (index === currentMonth) option.selected = true;
            monthSelect.appendChild(option);
        });
        yearSelect.innerHTML = '';
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    };

    // --- FUNCIÓN MODIFICADA: renderCalendar ---
    const renderCalendar = () => {
        const selectedDuration = consultationTypeSelect.value;
        const timeSlots = generateTimeSlots(selectedDuration);

        calendarGrid.innerHTML = '';
        const startOfWeek = new Date(currentWeekStart);
        startOfWeek.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
        currentWeekDisplay.textContent = getWeekRange(currentWeekStart);

        if (window.innerWidth > 768) {
            dayNames.forEach(day => {
                const dayHeader = document.createElement('div');
                dayHeader.classList.add('day-header');
                dayHeader.textContent = day;
                calendarGrid.appendChild(dayHeader);
            });
        }

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentDay = new Date(day);
            currentDay.setHours(0, 0, 0, 0);

            if (currentDay.getTime() === today.getTime()) dayElement.classList.add('today');

            const selectedMonth = parseInt(monthSelect.value);
            const selectedYear = parseInt(yearSelect.value);
            if (day.getMonth() === selectedMonth && day.getFullYear() === selectedYear) {
                dayElement.classList.add('current-month-day');
            } else {
                dayElement.style.opacity = '0.7';
            }

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            if (window.innerWidth <= 768) {
                dayNumber.textContent = `${dayNames[day.getDay()]} ${formatShortDate(day)}`;
            } else {
                dayNumber.textContent = day.getDate();
            }
            dayElement.appendChild(dayNumber);

            timeSlots.forEach(time => {
                const slotKey = `${day.toISOString().slice(0, 10)} ${time}`;
                const timeSlotDiv = document.createElement('div');
                timeSlotDiv.classList.add('time-slot');
                timeSlotDiv.textContent = time;
                timeSlotDiv.dataset.date = day.toISOString().slice(0, 10);
                timeSlotDiv.dataset.time = time;
                const slotDateTime = new Date(`${day.toISOString().slice(0, 10)}T${time}:00`);
                if (slotDateTime < new Date()) {
                    timeSlotDiv.classList.add('booked');
                    timeSlotDiv.title = "Hora pasada";
                } else if (bookedAppointments[slotKey]) {
                    timeSlotDiv.classList.add('booked');
                    timeSlotDiv.title = "Cita ya agendada";
                } else {
                    timeSlotDiv.addEventListener('click', () => openModal(timeSlotDiv));
                }
                dayElement.appendChild(timeSlotDiv);
            });
            calendarGrid.appendChild(dayElement);
        }
    };

    // --- openModal y closeModal (Sin cambios) ---
    const openModal = (slotElement) => {
        selectedSlot = slotElement;
        const date = new Date(slotElement.dataset.date);
        const time = slotElement.dataset.time;
        const doctorName = doctorSelect.value;
        modalDoctorName.textContent = doctorName;
        modalDate.textContent = formatDate(date);
        modalTime.textContent = time;
        appointmentForm.reset();
        phoneValidationMessage.textContent = '';
        phoneValidationMessage.className = 'validation-message';
        confirmAppointmentBtn.disabled = false;
        appointmentModal.classList.add('visible');
    };
    const closeModal = () => {
        appointmentModal.classList.remove('visible');
        selectedSlot = null;
    };

    // --- Validación de teléfono (Sin cambios) ---
    patientPhoneInput.addEventListener('input', () => {
        const value = patientPhoneInput.value.replace(/\D/g, '');
        patientPhoneInput.value = value;
        if (value.length > 0 && value.length < 10) {
            phoneValidationMessage.textContent = `Faltan ${10 - value.length} dígitos.`;
            phoneValidationMessage.className = 'validation-message ' + 'error';
        } else if (value.length === 10) {
            phoneValidationMessage.textContent = '✓ Número completo';
            phoneValidationMessage.className = 'validation-message ' + 'success';
        } else {
            phoneValidationMessage.textContent = '';
            phoneValidationMessage.className = 'validation-message';
        }
    });
    
    // --- FUNCIÓN MODIFICADA: appointmentForm event listener ---
    appointmentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (patientPhoneInput.value.length !== 10) {
            phoneValidationMessage.textContent = 'El número de teléfono debe tener 10 dígitos.';
            phoneValidationMessage.className = 'validation-message ' + 'error';
            return;
        }
        confirmAppointmentBtn.disabled = true;
        confirmAppointmentBtn.textContent = 'Confirmando...';

        const appointmentDetails = {
            doctor: doctorSelect.value,
            date: selectedSlot.dataset.date,
            time: selectedSlot.dataset.time,
            patientName: patientNameInput.value.trim(),
            patientPhone: patientPhoneInput.value.trim(),
            patientEmail: patientEmailInput.value.trim(),
            duration: consultationTypeSelect.value // <- AÑADIMOS LA DURACIÓN
        };

        fetch('https://hook.us2.make.com/e38eflwwnios13ggi9h4jlkj31s2xc28', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentDetails),
        })
        .then(response => {
            if (response.ok) return response.text();
            throw new Error('Hubo un problema con la solicitud a Make.com.');
        })
        .then(data => {
            console.log('Respuesta de Make.com:', data);
            const slotKey = `${appointmentDetails.date} ${appointmentDetails.time}`;
            bookedAppointments[slotKey] = true;
            if (selectedSlot) {
                selectedSlot.classList.add('booked');
                selectedSlot.title = "Cita ya agendada";
            }
            alert(`¡Cita confirmada para ${appointmentDetails.patientName}! Revisa tu correo para la invitación de calendario.`);
            closeModal();
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('No se pudo confirmar la cita. Por favor, inténtalo de nuevo.');
        })
        .finally(() => {
            confirmAppointmentBtn.textContent = 'Confirmar Cita';
            confirmAppointmentBtn.disabled = false;
        });
    });

    // --- NAVEGACIÓN Y EVENT LISTENERS (Con una adición) ---
    closeModalBtn.addEventListener('click', closeModal);
    appointmentModal.addEventListener('click', (e) => { if (e.target === appointmentModal) closeModal(); });
    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        monthSelect.value = currentWeekStart.getMonth();
        yearSelect.value = currentWeekStart.getFullYear();
        renderCalendar();
    });
    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        monthSelect.value = currentWeekStart.getMonth();
        yearSelect.value = currentWeekStart.getFullYear();
        renderCalendar();
    });
    monthSelect.addEventListener('change', () => {
        const newMonth = parseInt(monthSelect.value);
        const newYear = parseInt(yearSelect.value);
        currentWeekStart = new Date(newYear, newMonth, 1);
        renderCalendar();
    });
    yearSelect.addEventListener('change', () => {
        const newMonth = parseInt(monthSelect.value);
        const newYear = parseInt(yearSelect.value);
        currentWeekStart = new Date(newYear, newMonth, 1);
        renderCalendar();
    });

    // --- NUEVO EVENT LISTENER ---
    // Para que el calendario se actualice al cambiar el tipo de consulta
    consultationTypeSelect.addEventListener('change', renderCalendar);

    // --- INICIALIZACIÓN (Sin cambios) ---
    populateMonthYearDropdowns();
    renderCalendar();
    window.addEventListener('resize', renderCalendar);
});