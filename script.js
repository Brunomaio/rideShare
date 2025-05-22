document.addEventListener('DOMContentLoaded', () => {
    const authPage = document.getElementById('auth-page');
    const landingPage = document.getElementById('landing-page');
    const riderPage = document.getElementById('rider-page');
    const driverPage = document.getElementById('driver-page');

    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const authMessage = document.getElementById('auth-message'); // The message bar
    const logoutBtn = document.getElementById('logout-btn');

    const riderBtn = document.getElementById('rider-btn');
    const driverBtn = document.getElementById('driver-btn');
    const backBtns = document.querySelectorAll('.back-btn');

    const driverForm = document.getElementById('driver-form');
    const rideList = document.getElementById('ride-list');
    const myOfferedRidesDiv = document.getElementById('my-offered-rides');

    const rideHomeHourSelect = document.getElementById('ride-home-hour');
    const rideHomeMinuteSelect = document.getElementById('ride-home-minute');
    const rideOfficeHourSelect = document.getElementById('ride-office-hour');
    const rideOfficeMinuteSelect = document.getElementById('ride-office-minute');

    const riderDestinationFilterInput = document.getElementById('rider-destination-filter');


    const API_BASE_URL = 'http://127.0.0.1:5000'; 

    let currentUserToken = localStorage.getItem('accessToken');
    let currentUserEmail = localStorage.getItem('userEmail');

    // --- UI State Management ---
    function showPage(pageToShow) {
        authPage.classList.add('hidden');
        landingPage.classList.add('hidden');
        riderPage.classList.add('hidden');
        driverPage.classList.add('hidden');

        if (pageToShow === 'auth') {
            authPage.classList.remove('hidden');
            authMessage.textContent = ''; // Clear any previous message
            authMessage.style.display = 'none'; // Ensure the message bar is hidden
        } else if (pageToShow === 'landing') {
            landingPage.classList.remove('hidden');
        } else if (pageToShow === 'rider') {
            riderPage.classList.remove('hidden');
        } else if (pageToShow === 'driver') {
            driverPage.classList.remove('hidden');
        }
    }

    function checkLoginStatus() {
        if (currentUserToken && currentUserEmail) {
            showPage('landing');
        } else {
            showPage('auth');
        }
    }

    function populateTimeDropdowns() {
        const populateSelect = (selectElement, isHour) => {
            selectElement.innerHTML = `<option value="">${isHour ? 'Hour' : 'Minute'}</option>`;
            const limit = isHour ? 24 : 60;
            const step = isHour ? 1 : 10;
            for (let i = 0; i < limit; i += step) {
                const value = String(i).padStart(2, '0');
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectElement.appendChild(option);
            }
        };

        populateSelect(rideHomeHourSelect, true);
        populateSelect(rideHomeMinuteSelect, false);
        populateSelect(rideOfficeHourSelect, true);
        populateSelect(rideOfficeMinuteSelect, false);
    }

    // --- Helper for Email Validation ---
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // --- Helper for Button Loading State ---
    function setButtonLoadingState(button, isLoading, originalText = null) {
        if (isLoading) {
            if (originalText) {
                button.dataset.originalText = originalText;
            } else if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            
            button.innerHTML = `${button.dataset.originalText} <span class="loading-spinner"></span>`;
            button.disabled = true;
            button.classList.add('loading');
        } else {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
            button.classList.remove('loading');
            delete button.dataset.originalText;
        }
    }

    // --- NEW: Function to introduce a minimum delay ---
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // --- API Calls ---
    async function registerUser(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            authMessage.textContent = error.message;
            authMessage.style.color = 'red';
            authMessage.style.display = 'block';
            return null;
        }
    }

    async function loginUser(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            return data;
        } catch (error) {
            console.error('Login error:', error);
            authMessage.textContent = error.message;
            authMessage.style.color = 'red';
            authMessage.style.display = 'block';
            return null;
        }
    }

    async function fetchRides() {
        try {
            const response = await fetch(`${API_BASE_URL}/rides`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching rides:', error);
            return [];
        }
    }

    async function addRideToBackend(rideData) {
        try {
            const response = await fetch(`${API_BASE_URL}/rides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUserToken}`
                },
                body: JSON.stringify(rideData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error('Error adding ride:', error);
            alert(`Failed to add ride: ${error.message}`);
            return null;
        }
    }

    async function deleteRideFromBackend(rideId) {
        try {
            const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUserToken}`
                },
                body: JSON.stringify({}),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error('Error deleting ride:', error);
            alert(`Failed to delete ride: ${error.message}`);
            return false;
        }
    }

    // --- Render Functions ---
    async function renderRideList(filterText = '') {
        const rides = await fetchRides();
        rideList.innerHTML = '';

        let filteredRides = rides;
        if (filterText) {
            const lowerCaseFilter = filterText.toLowerCase();
            filteredRides = rides.filter(ride => 
                ride.destination.toLowerCase().includes(lowerCaseFilter)
            );
        }

        if (filteredRides.length === 0) {
            rideList.innerHTML = '<p>No rides available matching your criteria.</p>'; 
            if (!filterText) {
                rideList.innerHTML = '<p>No rides available yet. Be the first driver!</p>';
            }
            return;
        }

        filteredRides.sort((a, b) => {
            if (a.officeDepartureTime < b.officeDepartureTime) return -1;
            if (a.officeDepartureTime > b.officeDepartureTime) return 1;
            return 0;
        });

        filteredRides.forEach(ride => {
            const rideItem = document.createElement('div');
            rideItem.classList.add('ride-item');
            rideItem.innerHTML = `
                <p><strong>Driver:</strong> ${ride.name}</p>
                <p><strong>Destination:</strong> ${ride.destination}</p>
                <p><strong>Days:</strong> ${ride.days.join(', ')}</p>
                <p><strong>Leaving Home At:</strong> ${ride.homeDepartureTime}</p>
                <p><strong>Approx. Departure from Office:</strong> ${ride.officeDepartureTime}</p>
                <p><strong>Seats:</strong> ${ride.seats}</p>
                <p><strong>Smoking:</strong> ${ride.smokingAllowed ? 'Allowed' : 'Not Allowed'}</p>
                <p><strong>Cost:</strong> ${ride.cost || 'Free / Discuss with driver'}</p>
                <p class="contact-info"><strong>Contact:</strong> ${ride.contact}</p>
            `;
            rideList.appendChild(rideItem);
        });
    }

    async function renderMyOfferedRides() {
        const rides = await fetchRides();
        myOfferedRidesDiv.innerHTML = '';

        if (!currentUserToken) {
            myOfferedRidesDiv.innerHTML = '<p>Please log in to view your offered rides.</p>';
            return;
        }

        const driversOwnRides = rides.filter(ride => ride.user_email === currentUserEmail)
                                    .sort((a, b) => {
                                        if (a.officeDepartureTime < b.officeDepartureTime) return -1;
                                        if (a.officeDepartureTime > b.officeDepartureTime) return 1;
                                        return 0;
                                    });

        if (driversOwnRides.length === 0) {
            myOfferedRidesDiv.innerHTML = '<p>You haven\'t offered any rides yet.</p>';
            return;
        }

        driversOwnRides.forEach(ride => {
            const rideItem = document.createElement('div');
            rideItem.classList.add('ride-item');
            rideItem.innerHTML = `
                <p><strong>Destination:</strong> ${ride.destination}</p>
                <p><strong>Days:</strong> ${ride.days.join(', ')}</p>
                <p><strong>Leaving Home At:</strong> ${ride.homeDepartureTime}</p>
                <p><strong>Approx. Departure from Office:</strong> ${ride.officeDepartureTime}</p>
                <p><strong>Seats:</strong> ${ride.seats}</p>
                <p><strong>Smoking:</strong> ${ride.smokingAllowed ? 'Allowed' : 'Not Allowed'}</p>
                <p><strong>Cost:</strong> ${ride.cost || 'Free / Discuss with driver'}</p>
                <p class="contact-info"><strong>Your Contact:</strong> ${ride.contact}</p>
                <button class="remove-btn" data-id="${ride.id}">Remove This Ride</button>
            `;
            myOfferedRidesDiv.appendChild(rideItem);
        });
    }

    // --- Event Listeners ---

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    });

    loginBtn.addEventListener('click', async () => {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        authMessage.textContent = '';
        authMessage.style.display = 'none';

        if (!isValidEmail(email)) {
            authMessage.textContent = 'Please enter a valid email address.';
            authMessage.style.color = 'red';
            authMessage.style.display = 'block';
            return;
        }

        setButtonLoadingState(loginBtn, true, 'Login'); // Set loading state

        // Run API call and delay concurrently, wait for both to complete
        const [result] = await Promise.all([
            loginUser(email, password),
            delay(500) // Minimum 500ms delay for spinner visibility
        ]);
        
        setButtonLoadingState(loginBtn, false, 'Login'); // Reset loading state

        if (result && result.access_token) {
            currentUserToken = result.access_token;
            currentUserEmail = result.user_email;
            localStorage.setItem('accessToken', currentUserToken);
            localStorage.setItem('userEmail', currentUserEmail);
            
            authMessage.textContent = 'Login successful!';
            authMessage.style.color = 'green';
            authMessage.style.display = 'block';
            showPage('landing');
            authEmailInput.value = '';
            authPasswordInput.value = '';
        }
    });

    registerBtn.addEventListener('click', async () => {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        authMessage.textContent = '';
        authMessage.style.display = 'none';

        if (!isValidEmail(email)) {
            authMessage.textContent = 'Please enter a valid email address.';
            authMessage.style.color = 'red';
            authMessage.style.display = 'block';
            return;
        }

        setButtonLoadingState(registerBtn, true, 'Register'); // Set loading state
        
        // Run API call and delay concurrently, wait for both to complete
        const [result] = await Promise.all([
            registerUser(email, password),
            delay(500) // Minimum 500ms delay for spinner visibility
        ]);

        setButtonLoadingState(registerBtn, false, 'Register'); // Reset loading state

        if (result) {
            authMessage.textContent = 'Registration successful! You can now log in.';
            authMessage.style.color = 'green';
            authMessage.style.display = 'block';
            authEmailInput.value = '';
            authPasswordInput.value = '';
        }
    });

    logoutBtn.addEventListener('click', async () => { // Made async to await the delay
        setButtonLoadingState(logoutBtn, true, 'Logout'); // Set loading state
        
        // Introduce a small delay for the spinner to be visible before reload
        await delay(500); 

        currentUserToken = null;
        currentUserEmail = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userEmail');
        window.location.reload(); 
    });


    riderBtn.addEventListener('click', async () => {
        if (!currentUserToken) {
            alert('Please log in to view rides.');
            showPage('auth');
            return;
        }
        showPage('rider');
        riderDestinationFilterInput.value = ''; 
        await renderRideList();
    });

    driverBtn.addEventListener('click', async () => {
        if (!currentUserToken) {
            alert('Please log in to offer rides.');
            showPage('auth');
            return;
        }
        showPage('driver');
        await renderMyOfferedRides();
    });

    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showPage('landing');
        });
    });

    driverForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedDays = Array.from(document.querySelectorAll('input[name="available-days"]:checked'))
                                .map(checkbox => checkbox.value);

        if (selectedDays.length === 0) {
            alert('Please select at least one day you are available.');
            return;
        }
        
        const homeHour = rideHomeHourSelect.value;
        const homeMinute = rideHomeMinuteSelect.value;
        if (!homeHour || !homeMinute) {
            alert('Please select both hour and minute for "Leaving Home At".');
            return;
        }

        const officeHour = rideOfficeHourSelect.value;
        const officeMinute = rideOfficeMinuteSelect.value;
        if (!officeHour || !officeMinute) {
            alert('Please select both hour and minute for "Approximate Time of departure from the office".');
            return;
        }

        const offerRideBtn = driverForm.querySelector('button[type="submit"]');
        setButtonLoadingState(offerRideBtn, true, 'Offer This Ride');

        const newRide = {
            name: document.getElementById('driver-name').value,
            contact: document.getElementById('driver-contact').value,
            destination: document.getElementById('driver-destination').value,
            days: selectedDays,
            homeDepartureTime: `${homeHour}:${homeMinute}`,
            officeDepartureTime: `${officeHour}:${officeMinute}`,
            seats: parseInt(document.getElementById('available-seats').value),
            smokingAllowed: document.getElementById('smoking-allowed').checked,
            cost: document.getElementById('sharing-cost').value,
        };

        // Run API call and delay concurrently, wait for both to complete
        const [addedRide] = await Promise.all([
            addRideToBackend(newRide),
            delay(500) // Minimum 500ms delay for spinner visibility
        ]);

        setButtonLoadingState(offerRideBtn, false, 'Offer This Ride'); // Reset loading state

        if (addedRide) {
            driverForm.reset();
            document.querySelectorAll('input[name="available-days"]').forEach(checkbox => checkbox.checked = false);
            document.getElementById('smoking-allowed').checked = false;
            
            rideHomeHourSelect.value = '';
            rideHomeMinuteSelect.value = '';
            rideOfficeHourSelect.value = '';
            rideOfficeMinuteSelect.value = '';

            alert('Your ride has been added!');
            await renderMyOfferedRides();
            await renderRideList(riderDestinationFilterInput.value); 
        }
    });

    myOfferedRidesDiv.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const rideIdToRemove = parseInt(e.target.dataset.id);
            const confirmed = confirm('Are you sure you want to remove this ride?');
            if (confirmed) {
                setButtonLoadingState(e.target, true, 'Remove This Ride');
                
                // Run API call and delay concurrently, wait for both to complete
                const [success] = await Promise.all([
                    deleteRideFromBackend(rideIdToRemove),
                    delay(500) // Minimum 500ms delay for spinner visibility
                ]);

                if (success) {
                    alert('Ride removed successfully!');
                    await renderMyOfferedRides();
                    await renderRideList(riderDestinationFilterInput.value); 
                } else {
                    setButtonLoadingState(e.target, false, 'Remove This Ride'); // Reset if failed
                }
            }
        }
    });

    riderDestinationFilterInput.addEventListener('input', (e) => {
        renderRideList(e.target.value);
    });

    populateTimeDropdowns();
    checkLoginStatus(); // Initial check on page load
});