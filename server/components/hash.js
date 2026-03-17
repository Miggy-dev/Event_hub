import bcrypt from 'bcrypt';

export function hashPassword(password, salt) {
    return bcrypt.hashSync(password, salt);
}

export function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}