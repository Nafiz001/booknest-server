require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const books = [
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-Help",
    description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones. Tiny changes, remarkable results. No matter your goals, Atomic Habits offers a proven framework for improving every day.",
    price: 16.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
    rating: 4.8,
    reviews: 12543,
    stock: 50,
    createdAt: new Date().toISOString()
  },
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Finance",
    description: "Timeless lessons on wealth, greed, and happiness. Doing well with money isn't necessarily about what you know. It's about how you behave.",
    price: 14.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1581527774i/41881472.jpg",
    rating: 4.7,
    reviews: 8924,
    stock: 45,
    createdAt: new Date().toISOString()
  },
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiction",
    description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.",
    price: 15.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
    rating: 4.5,
    reviews: 15234,
    stock: 60,
    createdAt: new Date().toISOString()
  },
  {
    title: "Educated",
    author: "Tara Westover",
    category: "Memoir",
    description: "A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
    price: 17.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
    rating: 4.6,
    reviews: 9876,
    stock: 35,
    createdAt: new Date().toISOString()
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    category: "Thriller",
    description: "Alicia Berenson's life is seemingly perfect. One evening her husband Gabriel returns home late, and Alicia shoots him five times in the face, and then never speaks another word.",
    price: 13.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582759969i/40097951.jpg",
    rating: 4.4,
    reviews: 11234,
    stock: 55,
    createdAt: new Date().toISOString()
  },
  {
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    category: "Fiction",
    description: "For years, rumors of the 'Marsh Girl' have haunted Barkley Cove, a quiet town on the North Carolina coast. So in late 1969, when handsome Chase Andrews is found dead, the locals immediately suspect Kya Clark.",
    price: 16.49,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582135294i/36809135.jpg",
    rating: 4.7,
    reviews: 14567,
    stock: 40,
    createdAt: new Date().toISOString()
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    category: "Science Fiction",
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish. Except that right now, he doesn't know that.",
    price: 18.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1597695864i/54493401.jpg",
    rating: 4.9,
    reviews: 13456,
    stock: 48,
    createdAt: new Date().toISOString()
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "History",
    description: "A Brief History of Humankind. From examining the role evolving humans have played in the global ecosystem to charting the rise of empires, Sapiens integrates history and science.",
    price: 19.99,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1703329310i/23692271.jpg",
    rating: 4.6,
    reviews: 10987,
    stock: 42,
    createdAt: new Date().toISOString()
  },
  {
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    category: "Fiction",
    description: "Aging and reclusive Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous and scandalous life. But when she chooses unknown magazine reporter Monique Grant for the job, no one is more astounded than Monique herself.",
    price: 15.49,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1618404891i/32620332.jpg",
    rating: 4.8,
    reviews: 16789,
    stock: 52,
    createdAt: new Date().toISOString()
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    category: "Psychology",
    description: "In this work, Kahneman explains the two systems that drive the way we think. System 1 is fast, intuitive, and emotional; System 2 is slower, more deliberative, and more logical.",
    price: 17.49,
    image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg",
    rating: 4.5,
    reviews: 9234,
    stock: 38,
    createdAt: new Date().toISOString()
  }
];

async function populateBooks() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('booknestDB');
    const booksCollection = db.collection('books');

    // Check if books already exist
    const existingCount = await booksCollection.countDocuments();
    console.log(`📚 Current books in database: ${existingCount}`);

    if (existingCount >= 10) {
      console.log('⚠️  Database already has 10 or more books. Skipping insertion.');
      console.log('💡 If you want to add these books anyway, delete existing books first.');
      return;
    }

    // Insert books
    const result = await booksCollection.insertMany(books);
    console.log(`✅ Successfully inserted ${result.insertedCount} books!`);
    
    // Display inserted books
    console.log('\n📖 Inserted Books:');
    books.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title} by ${book.author} - $${book.price}`);
    });

  } catch (error) {
    console.error('❌ Error populating books:', error);
  } finally {
    await client.close();
    console.log('\n✅ Database connection closed');
  }
}

populateBooks();
