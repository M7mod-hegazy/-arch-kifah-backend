# Arch Kifah Backend API

Backend API for the Arch Kifah project management system built with Node.js, Express, and MongoDB.

## Features

- 🗄️ MongoDB integration with Mongoose
- 📊 Project management API endpoints
- 📸 Image upload with Cloudinary integration
- 👤 User management
- 🔔 Real-time notifications
- 🔒 CORS configuration
- ⚡ Optimized for performance

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ODM**: Mongoose
- **Image Storage**: Cloudinary
- **Deployment**: Vercel

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Images
- `POST /api/images/upload` - Upload image to Cloudinary
- `DELETE /api/images/:publicId` - Delete image from Cloudinary

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Optional |

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/M7mod-hegazy/-arch-kifah-backend.git
   cd -arch-kifah-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8080
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Start development server**
   ```bash
   npm start
   ```

## Deployment to Vercel

### Prerequisites
- Vercel account
- MongoDB Atlas database
- Cloudinary account (optional, for image uploads)

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy backend to Vercel"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables in Vercel:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `NODE_ENV`: `production`
     - `FRONTEND_URL`: Your frontend URL (e.g., `https://arch-kifah.vercel.app`)
     - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
     - `CLOUDINARY_API_KEY`: Your Cloudinary API key
     - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

3. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your API

## Project Structure

```
backend/
├── config/
│   ├── database.js      # MongoDB connection
│   └── cloudinary.js    # Cloudinary configuration
├── routes/
│   ├── projects.js      # Project routes
│   ├── images.js        # Image upload routes
│   └── users.js         # User routes
├── services/
│   ├── ProjectService.js # Project business logic
│   └── ImageService.js   # Image handling logic
├── server.js            # Main server file
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Scripts

- `npm start` - Start the server
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests (if configured)

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:8080` (development)
- Your production frontend URL (configured via `FRONTEND_URL`)

## Database Schema

### Project Schema
```javascript
{
  title: String,
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String
  },
  startDate: Date,
  endDate: Date,
  status: String,
  totalCost: Number,
  originalCost: Number,
  subgoals: Array,
  images: Array,
  history: Array,
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
  updatedBy: String
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.
