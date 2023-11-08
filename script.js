document.addEventListener('DOMContentLoaded', function() {
    const numberInput = document.getElementById('number');
    const digitButtons = document.querySelectorAll('.digit');
    const callButton = document.getElementById('call-btn');
    const callStatus = document.querySelector('.call-status');

    digitButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentNumber = numberInput.value;
            const digit = button.textContent;
            numberInput.value = currentNumber + digit;
        });
    });

    callButton.addEventListener('click', () => {
        const phoneNumber = numberInput.value;
        callStatus.textContent = `Llamando a ${phoneNumber}`;
    });
});