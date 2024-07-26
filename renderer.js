let currentShows = [];

function getUpcomingWeekends(numberOfWeeks) {
    const weekends = [];
    const currentDate = new Date();

    // Find the next Friday
    while (currentDate.getDay() !== 5) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    for (let i = 0; i < numberOfWeeks; i++) {
        const friday = new Date(currentDate);
        const saturday = new Date(currentDate);
        saturday.setDate(saturday.getDate() + 1);
        weekends.push({ friday, saturday });
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return weekends;
}

function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function convertTo12Hour(time24) {
    const [hours, minutes] = time24.split(':');
    let period = 'AM';
    let hours12 = parseInt(hours, 10);

    if (hours12 >= 12) {
        period = 'PM';
        if (hours12 > 12) {
            hours12 -= 12;
        }
    }

    if (hours12 === 0) {
        hours12 = 12;
    }

    return `${hours12}:${minutes} ${period}`;
}

function formatShowDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function createShowItem(show, date) {
    const showItem = document.createElement('div');
    showItem.className = 'show-item';
    showItem.setAttribute('data-id', show.id);

    if (show.totalGuests < show.max) {
        showItem.classList.add('available');
    } else if (show.totalGuests >= show.max) {
        showItem.classList.add('booked');
    }
    const time12Hour = convertTo12Hour(show.time);
    const formattedDate = formatShowDate(date);

    showItem.innerHTML = `
        <div class="show-header">${formattedDate} - ${time12Hour}</div>
        <div class="show-details">
            <div>
                <span>Venue: ${show.description}</span>
                <span>Time: <span class="${show.totalGuests >= show.max ? 'booked-highlight' : (show.totalGuests < show.max ? 'available-highlight' : 'highlight')}">${time12Hour}</span></span>
            </div>
            <div>
                <span>Cover: $${show.cover}</span>
                <span>Guests: <span class="${show.totalGuests >= show.max ? 'booked-highlight' : 'highlight'}">${show.totalGuests}</span>/${show.max}</span>
            </div>
        </div>
    `;

    return showItem;
}

async function fetchAndDisplayShows(date, showList, dayGroup) {
    const formattedDate = formatDateForAPI(date);
    try {
        const shows = await window.api.fetchShows(formattedDate);

        const filteredShows = shows.filter(show => {
            const includesMacDougal = show.description.toLowerCase().includes('macdougal');
            return includesMacDougal && !show.soldout;
        });

        filteredShows.forEach(show => {
            const showDate = new Date(date);
            const [hours, minutes] = show.time.split(':');
            showDate.setHours(parseInt(hours), parseInt(minutes));

            const showItem = createShowItem(show, showDate);
            showItem.setAttribute('data-id', show.id);
            dayGroup.appendChild(showItem);
        });

        return filteredShows;
    } catch (error) {
        console.error(`Error fetching shows for ${formattedDate}:`, error);
        return [];
    }
}

async function displayShows() {
    const numberOfWeeks = 12;
    const weekends = getUpcomingWeekends(numberOfWeeks);
    const showList = document.getElementById('showList');
    showList.innerHTML = ''; // Clear the list before repopulating
    let firstAvailableSlot = null;

    for (const weekend of weekends) {
        const weekendGroup = document.createElement('div');
        weekendGroup.className = 'weekend-group';

        const fridayGroup = document.createElement('div');
        fridayGroup.className = 'day-group friday-group';
        const fridayHeader = document.createElement('h2');
        fridayHeader.textContent = formatShowDate(weekend.friday);
        fridayGroup.appendChild(fridayHeader);

        const saturdayGroup = document.createElement('div');
        saturdayGroup.className = 'day-group saturday-group';
        const saturdayHeader = document.createElement('h2');
        saturdayHeader.textContent = formatShowDate(weekend.saturday);
        saturdayGroup.appendChild(saturdayHeader);

        const fridayShows = await fetchAndDisplayShows(weekend.friday, showList, fridayGroup);
        const saturdayShows = await fetchAndDisplayShows(weekend.saturday, showList, saturdayGroup);

        if (fridayGroup.children.length > 1) weekendGroup.appendChild(fridayGroup);
        if (saturdayGroup.children.length > 1) weekendGroup.appendChild(saturdayGroup);

        if (weekendGroup.children.length > 0) {
            showList.appendChild(weekendGroup);
        }

        if (!firstAvailableSlot) {
            const availableShow = [...fridayShows, ...saturdayShows].find(show => show.totalGuests < show.max);
            if (availableShow) {
                firstAvailableSlot = weekendGroup.querySelector(`.show-item[data-id="${availableShow.id}"]`);
            }
        }
    }

    if (firstAvailableSlot) {
        setTimeout(() => {
            firstAvailableSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100); // Short delay to ensure DOM is fully rendered
    }
}

function isDataChanged(oldData, newData) {
    if (oldData.length !== newData.length) return true;

    for (let i = 0; i < oldData.length; i++) {
        if (oldData[i].id !== newData[i].id ||
          oldData[i].totalGuests !== newData[i].totalGuests) {
            return true;
        }
    }
    return false;
}

async function checkForUpdates() {
    const numberOfWeeks = 12;
    const weekends = getUpcomingWeekends(numberOfWeeks);
    let newShows = [];

    for (const weekend of weekends) {
        const fridayShows = await fetchAndDisplayShows(weekend.friday, null, document.createElement('div'));
        const saturdayShows = await fetchAndDisplayShows(weekend.saturday, null, document.createElement('div'));
        newShows = [...newShows, ...fridayShows, ...saturdayShows];
    }

    if (isDataChanged(currentShows, newShows)) {
        displayShows();
        currentShows = newShows;
    } else {
        const showList = document.getElementById('showList');
        showList.classList.remove('dimmed');
    }
}

function startCountdown(duration) {
    let timer = duration;
    const countdownElement = document.getElementById('timer');

    const countdownInterval = setInterval(() => {
        countdownElement.textContent = timer;
        if (--timer < 0) {
            clearInterval(countdownInterval);
            dimScheduleBlocks();
            checkForUpdates().then(() => {
                startCountdown(duration); // Restart the countdown after updating
                const showList = document.getElementById('showList');
                showList.classList.remove('dimmed'); // Remove the dimmed class after refreshing
            });
        }
    }, 1000);

    return countdownInterval;
}

function dimScheduleBlocks() {
    const showList = document.getElementById('showList');
    showList.classList.add('dimmed');
}

document.addEventListener('DOMContentLoaded', () => {
    displayShows();
    currentShows = [];

    const refreshInterval = 60; // Refresh interval in seconds
    startCountdown(refreshInterval);
});
