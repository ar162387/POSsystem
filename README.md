# Inventory Management System

A desktop application built with Electron, React, and Tailwind CSS for managing inventory, customers, and invoices.

## Features

- **User Authentication**: Admin and Cashier roles with appropriate permissions
- **Inventory Management**: Add, update, and delete inventory items
- **Financial Details**: Manage rates and costs for each item
- **Customer Management**: Organize customer contacts
- **Invoice Generation**: Create invoices for customers with automatic stock adjustment
- **Customer Payables**: Track payments and outstanding balances

## Default Credentials

- **Admin**: Username - `admin`, Password - `admin123`

## Setup Development Environment

1. Clone the repository:
```
git clone <repository-url>
cd inventory-management-system
```

2. Install dependencies:
```
npm install
```

3. Start the development environment:
```
npm start
```

## Build for Production

To create a production build:

```
npm run build
```

This will generate a distributable in the `dist` folder.

## Technology Stack

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Electron.js
- **Database**: NeDB (embedded NoSQL database)
- **Authentication**: bcrypt.js

## License

ISC
