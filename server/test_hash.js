import bcrypt from 'bcrypt';

try {
    const h1 = bcrypt.hashSync('pass', 10);
    console.log('With rounds 10:', h1);
    
    const h2 = bcrypt.hashSync('pass', undefined);
    console.log('With undefined:', h2);
} catch (err) {
    console.error('Error with undefined:', err.message);
}
