document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const monthSelect = document.getElementById('month-select'); // New
    const yearSelect = document.getElementById('year-select');   // New
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

    let currentWeekStart = new Date(); // Represents the start of the currently displayed week (Sunday)
    let selectedSlot = null;
    let bookedAppointments = {}; // Simple in-memory storage for booked slots: { 'YYYY-MM-DD HH:MM': true }

    // Helper to format dates
    const formatDate = (date) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    };

    const formatShortDate = (date) => {
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    const getWeekRange = (date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    };

    // Generate time slots for a day
    const generateTimeSlots = () => {
        const slots = [];
        // Example slots from 9:00 to 17:00, every 30 minutes, skipping 14:00-15:00 for lunch
        for (let h = 9; h <= 17; h++) {
            if (h === 14) continue; // Skip 2 PM hour for lunch
            for (let m = 0; m < 60; m += 30) {
                if (h === 17 && m === 30) continue; // Don't allow 17:30 if last slot is 17:00
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Function to populate month and year dropdowns
    const populateMonthYearDropdowns = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Populate months
        monthSelect.innerHTML = '';
        monthNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = name;
            if (index === currentMonth) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        });

        // Populate years (e.g., current year +/- 5 years)
        yearSelect.innerHTML = '';
        for (let i = currentYear - 2; i <= currentYear + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    };

    // Render calendar for the current week
    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        const startOfWeek = new Date(currentWeekStart);
        startOfWeek.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Adjust to Sunday

        currentWeekDisplay.textContent = getWeekRange(currentWeekStart);

        // Add day headers for larger screens
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
            today.setHours(0, 0, 0, 0); // Normalize 'today' to start of day
            const currentDay = new Date(day);
            currentDay.setHours(0, 0, 0, 0); // Normalize 'day' to start of day

            // Check if it's the current day
            if (currentDay.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Check if the day belongs to the currently selected month/year from dropdowns
            const selectedMonth = parseInt(monthSelect.value);
            const selectedYear = parseInt(yearSelect.value);
            if (day.getMonth() === selectedMonth && day.getFullYear() === selectedYear) {
                dayElement.classList.add('current-month-day');
            } else {
                // For days outside the selected month, reduce opacity or change background slightly
                dayElement.style.opacity = '0.7';
            }

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            // Display full date for small screens, just day number for large
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

                // Disable past slots
                const slotDateTime = new Date(`${day.toISOString().slice(0, 10)}T${time}:00`);
                if (slotDateTime < new Date()) {
                    timeSlotDiv.classList.add('booked'); // Treat as booked if in past
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

    const openModal = (slotElement) => {
        selectedSlot = slotElement;
        const date = new Date(slotElement.dataset.date);
        const time = slotElement.dataset.time;
        const doctorName = doctorSelect.value;

        modalDoctorName.textContent = doctorName;
        modalDate.textContent = formatDate(date);
        modalTime.textContent = time;

        // Reset form fields and validation messages
        appointmentForm.reset();
        phoneValidationMessage.textContent = '';
        phoneValidationMessage.className = 'validation-message';
        confirmAppointmentBtn.disabled = false; // Enable button initially

        appointmentModal.classList.add('visible');
    };

    const closeModal = () => {
        appointmentModal.classList.remove('visible');
        selectedSlot = null;
    };

    closeModalBtn.addEventListener('click', closeModal);
    appointmentModal.addEventListener('click', (e) => {
        if (e.target === appointmentModal) {
            closeModal();
        }
    });

    // Phone number validation
    patientPhoneInput.addEventListener('input', () => {
        const value = patientPhoneInput.value.replace(/\D/g, ''); // Remove non-digits
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

    // Handle form submission
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
            patientEmail: patientEmailInput.value.trim()
        };

        // Simulate API call
        setTimeout(() => {
            // Mark the slot as booked
            const slotKey = `${appointmentDetails.date} ${appointmentDetails.time}`;
            bookedAppointments[slotKey] = true;
            selectedSlot.classList.add('booked');
            selectedSlot.removeEventListener('click', () => openModal(selectedSlot)); // Remove click listener
            selectedSlot.title = "Cita ya agendada";

            alert(`Cita confirmada para ${appointmentDetails.patientName} con ${appointmentDetails.doctor} el ${formatDate(new Date(appointmentDetails.date))} a las ${appointmentDetails.time}.`);
            closeModal();
            confirmAppointmentBtn.textContent = 'Confirmar Cita';
            confirmAppointmentBtn.disabled = false;
        }, 1500); // Simulate network delay
    });

    // Navigation buttons
    prevWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        // Update dropdowns if week navigation crosses month/year boundaries
        monthSelect.value = currentWeekStart.getMonth();
        yearSelect.value = currentWeekStart.getFullYear();
        renderCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        // Update dropdowns if week navigation crosses month/year boundaries
        monthSelect.value = currentWeekStart.getMonth();
        yearSelect.value = currentWeekStart.getFullYear();
        renderCalendar();
    });

    // Event listeners for month and year dropdowns
    monthSelect.addEventListener('change', () => {
        const newMonth = parseInt(monthSelect.value);
        const newYear = parseInt(yearSelect.value);
        currentWeekStart = new Date(newYear, newMonth, 1); // Set to the first day of the selected month
        renderCalendar();
    });

    yearSelect.addEventListener('change', () => {
        const newMonth = parseInt(monthSelect.value);
        const newYear = parseInt(yearSelect.value);
        currentWeekStart = new Date(newYear, newMonth, 1); // Set to the first day of the selected month
        renderCalendar();
    });

    // Initial setup
    populateMonthYearDropdowns();
    renderCalendar();
    window.addEventListener('resize', renderCalendar); // Re-render on resize to adjust day headers
});