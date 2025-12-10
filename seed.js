const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Book = require('./models/Book');
const connectDB = require('./config/db');

/**
 * Seed database with initial data
 */
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Book.deleteMany({});
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@booknest.com',
      password: adminPassword,
      role: 'admin',
      authProvider: 'email'
    });
    console.log('✅ Admin user created');
    
    // Create librarian users
    const librarianPassword = await bcrypt.hash('librarian123', 10);
    const librarian1 = await User.create({
      name: 'John Librarian',
      email: 'john@booknest.com',
      password: librarianPassword,
      role: 'librarian',
      authProvider: 'email'
    });
    
    const librarian2 = await User.create({
      name: 'Sarah Librarian',
      email: 'sarah@booknest.com',
      password: librarianPassword,
      role: 'librarian',
      authProvider: 'email'
    });
    console.log('✅ Librarian users created');
    
    // Create regular users
    const userPassword = await bcrypt.hash('user123', 10);
    await User.create({
      name: 'Alice Reader',
      email: 'alice@example.com',
      password: userPassword,
      role: 'user',
      authProvider: 'email'
    });
    
    await User.create({
      name: 'Bob Reader',
      email: 'bob@example.com',
      password: userPassword,
      role: 'user',
      authProvider: 'email'
    });
    console.log('✅ Regular users created');
    
    // Create sample books
    const books = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A classic novel depicting the American Dream in the Jazz Age.',
        category: 'Fiction',
        price: 15.99,
        isbn: '9780743273565',
        publisher: 'Scribner',
        publishedDate: new Date('1925-04-10'),
        pages: 180,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
        stock: 25,
        status: 'published',
        addedBy: librarian1._id
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'A gripping tale of racial injustice and childhood innocence.',
        category: 'Fiction',
        price: 18.99,
        isbn: '9780061120084',
        publisher: 'Harper Perennial',
        publishedDate: new Date('1960-07-11'),
        pages: 324,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/8228691-L.jpg',
        stock: 30,
        status: 'published',
        addedBy: librarian1._id
      },
      {
        title: '1984',
        author: 'George Orwell',
        description: 'A dystopian social science fiction novel and cautionary tale.',
        category: 'Science Fiction',
        price: 16.99,
        isbn: '9780451524935',
        publisher: 'Signet Classic',
        publishedDate: new Date('1949-06-08'),
        pages: 328,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
        stock: 20,
        status: 'published',
        addedBy: librarian2._id
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        description: 'A romantic novel of manners set in Georgian England.',
        category: 'Romance',
        price: 14.99,
        isbn: '9780141439518',
        publisher: 'Penguin Classics',
        publishedDate: new Date('1813-01-28'),
        pages: 432,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/8533086-L.jpg',
        stock: 15,
        status: 'published',
        addedBy: librarian2._id
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        description: 'A story about teenage rebellion and alienation.',
        category: 'Fiction',
        price: 17.99,
        isbn: '9780316769174',
        publisher: 'Little, Brown and Company',
        publishedDate: new Date('1951-07-16'),
        pages: 277,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
        stock: 18,
        status: 'published',
        addedBy: librarian1._id
      },
      {
        title: 'Harry Potter and the Sorcerers Stone',
        author: 'J.K. Rowling',
        description: 'The first book in the magical Harry Potter series.',
        category: 'Fantasy',
        price: 24.99,
        isbn: '9780439708180',
        publisher: 'Scholastic',
        publishedDate: new Date('1998-09-01'),
        pages: 309,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/10521270-L.jpg',
        stock: 40,
        status: 'published',
        addedBy: librarian1._id
      },
      {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        description: 'A fantasy novel about the adventures of hobbit Bilbo Baggins.',
        category: 'Fantasy',
        price: 19.99,
        isbn: '9780547928227',
        publisher: 'Houghton Mifflin Harcourt',
        publishedDate: new Date('1937-09-21'),
        pages: 310,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/8379893-L.jpg',
        stock: 22,
        status: 'published',
        addedBy: librarian2._id
      },
      {
        title: 'Sapiens: A Brief History of Humankind',
        author: 'Yuval Noah Harari',
        description: 'An exploration of the history and impact of Homo sapiens.',
        category: 'History',
        price: 22.99,
        isbn: '9780062316110',
        publisher: 'Harper',
        publishedDate: new Date('2015-02-10'),
        pages: 443,
        language: 'English',
        image: 'https://covers.openlibrary.org/b/id/8465892-L.jpg',
        stock: 35,
        status: 'published',
        addedBy: librarian1._id
      }
    ];
    
    await Book.insertMany(books);
    console.log('✅ Sample books created');
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('Admin: admin@booknest.com / admin123');
    console.log('Librarian: john@booknest.com / librarian123');
    console.log('User: alice@example.com / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
