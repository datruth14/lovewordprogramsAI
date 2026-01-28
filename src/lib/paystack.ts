const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function initializeTransaction(email: string, amountInNaira: number) {
    const amountInKobo = amountInNaira * 100;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            amount: amountInKobo,
            callback_url: process.env.PAYSTACK_CALLBACK_URL,
        }),
    });

    return response.json();
}

export async function verifyTransaction(reference: string) {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
    });

    return response.json();
}
