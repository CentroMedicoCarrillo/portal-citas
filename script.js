document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
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
    const consultationTypeSelect = document.getElementById('consultation-type-select');

    // --- WEBHOOKS ---
    const availabilityWebhookUrl = 'https://hook.us2.make.com/zd9zkvqwn5s575tok2k7sopctcnaxcu4';
    const createAppointmentWebhookUrl = 'https://hook.us2.make.com/e38eflwwnios13ggi9h4jlkj31s2xc28'; // Tu webhook existente

    let currentWeekStart = new Date();
    let selectedSlot = null;
    let bookedAppointments = {};

    // --- LÓGICA DE DISPONIBILIDAD (VERSIÓN CORREGIDA) ---
const fetchAvailability = async (startDate, endDate) => {
    try {
        // Muestra un indicador de carga
        calendarGrid.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando disponibilidad...</p>';

        // --- INICIA CAMBIO ---
        // Construimos la URL con los parámetros directamente, como una petición GET
        const urlWithParams = `${availabilityWebhookUrl}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

        const response = await fetch(urlWithParams); // Ya no necesitamos method, headers ni body
        // --- TERMINA CAMBIO ---
        
        if (!response.ok) throw new Error('Error al obtener la disponibilidad');
        
        const data = await response.json();
        
        bookedAppointments = {}; // Limpiamos las citas anteriores
        if (data.bookedSlots) {
            // El resto de esta sección puede variar dependiendo de cómo configuraste el Text Aggregator.
            // Esta versión asume que bookedSlots es un array de fechas ISO.
            const slotsArray = Array.isArray(data.bookedSlots) ? data.bookedSlots : (data.bookedSlots.text || "").split(',');

            slotsArray.forEach(isoString => {
                if (!isoString) return;
                const date = new Date(isoString);
                // Corrección para la zona horaria al procesar la respuesta
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                const localDate = new Date(date.getTime() + userTimezoneOffset);

                const year = localDate.getFullYear();
                const month = String(localDate.getMonth() + 1).padStart(2, '0');
                const day = String(localDate.getDate()).padStart(2, '0');
                const hours = String(localDate.getHours()).padStart(2, '0');
                const minutes = String(localDate.getMinutes()).padStart(2, '0');
                const slotKey = `${year}-${month}-${day} ${hours}:${minutes}`;
                bookedAppointments[slotKey] = true;
            });
        }
    } catch (error) {
        console.error("No se pudo cargar la disponibilidad:", error);
        calendarGrid.innerHTML = '<p style="text-align: center; padding: 20px; color: red;">Error al cargar la disponibilidad. Intente de nuevo.</p>';
    }
};

    // --- LÓGICA DEL CALENDARIO ---
    const renderCalendar = async () => {
        const startOfWeek = new Date(currentWeekStart);
        startOfWeek.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        await fetchAvailability(startOfWeek, endOfWeek);

        const selectedDuration = consultationTypeSelect.value;
        const timeSlots = generateTimeSlots(selectedDuration);
        calendarGrid.innerHTML = '';
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
    
    // --- FUNCIONES AUXILIARES Y DE FORMULARIO ---
    const generateTimeSlots = (durationMinutes) => {
        const slots = [];
        const interval = parseInt(durationMinutes);
        for (let h = 8; h < 20; h++) {
            if (h === 14) continue;
            for (let m = 0; m < 60; m += interval) {
                if (h === 19 && (m + interval) > 60) continue;
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };

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

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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
            duration: consultationTypeSelect.value
        };

        fetch(createAppointmentWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentDetails),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'error') {
                alert(data.message);
            } else {
                console.log('Respuesta de Make.com:', data);
                const slotKey = `${appointmentDetails.date} ${appointmentDetails.time}`;
                bookedAppointments[slotKey] = true;
                if (selectedSlot) {
                    selectedSlot.classList.add('booked');
                    selectedSlot.title = "Cita ya agendada";
                }
                alert(`${data.message} para ${appointmentDetails.patientName}. Revisa tu correo para la invitación de calendario.`);
                closeModal();
                renderCalendar();
            }
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('No se pudo confirmar la cita. Hubo un problema de conexión.');
        })
        .finally(() => {
            confirmAppointmentBtn.textContent = 'Confirmar Cita';
            confirmAppointmentBtn.disabled = false;
        });
    });

    // --- EVENT LISTENERS ---
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
    consultationTypeSelect.addEventListener('change', renderCalendar);

    // --- INICIALIZACIÓN ---
    populateMonthYearDropdowns();
    renderCalendar(); // Carga inicial del calendario
    window.addEventListener('resize', renderCalendar);
});