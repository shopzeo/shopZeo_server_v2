# Product Search API Documentation

## Overview
The Product Search API provides full text search functionality for products with advanced filtering, sorting, and pagination capabilities.

## Endpoint
```
GET /api/products/search
```

## Query Parameters

### Required Parameters
- `q` (string): Search query - required

### Optional Parameters
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of results per page (default: 20, max: 100)
- `store_id` (string): Filter by store ID
- `category_id` (number): Filter by category ID
- `sub_category_id` (number): Filter by sub-category ID
- `min_price` (number): Minimum price filter
- `max_price` (number): Maximum price filter
- `is_active` (boolean): Filter by active status (true/false)
- `is_featured` (boolean): Filter by featured status (true/false)
- `sort_by` (string): Sort results by:
  - `relevance` (default): Sort by search relevance
  - `price_asc`: Sort by price ascending
  - `price_desc`: Sort by price descending
  - `name_asc`: Sort by name ascending
  - `name_desc`: Sort by name descending
  - `rating_desc`: Sort by rating descending

## Search Features

### Full Text Search
The search uses MySQL's full text search capabilities on the following fields:
- `name`: Product name
- `description`: Product description
- `product_code`: Product code
- `sku_id`: SKU identifier

### Fallback Search
If full text search doesn't return results, the API falls back to LIKE queries for broader matching.

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Search completed successfully",
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "description": "Product description",
      "product_code": "PROD001",
      "sku_id": "SKU001",
      "selling_price": 99.99,
      "mrp": 149.99,
      "quantity": 100,
      "rating": 4.5,
      "total_reviews": 25,
      "is_active": true,
      "is_featured": false,
      "store": {
        "id": "store-uuid",
        "name": "Store Name"
      },
      "category": {
        "id": 1,
        "name": "Category Name"
      },
      "subCategory": {
        "id": 1,
        "name": "Sub Category Name"
      },
      "productMedia": [
        {
          "id": 1,
          "media_type": "image",
          "media_url": "/uploads/image.jpg",
          "media_order": 1
        }
      ]
    }
  ],
  "search_stats": {
    "query": "search term",
    "total_results": 50,
    "page": 1,
    "limit": 20,
    "total_pages": 3,
    "has_more": true
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "message": "Search query is required"
}
```

### Error Response (500)
```json
{
  "success": false,
  "message": "Failed to search products",
  "error": "Error details"
}
```

## Example Requests

### Basic Search
```bash
GET /api/products/search?q=laptop
```

### Search with Filters
```bash
GET /api/products/search?q=phone&category_id=1&min_price=100&max_price=1000&is_active=true
```

### Search with Pagination and Sorting
```bash
GET /api/products/search?q=electronics&page=2&limit=10&sort_by=price_asc
```

### Advanced Search
```bash
GET /api/products/search?q=gaming%20laptop&store_id=store-uuid&category_id=2&is_featured=true&sort_by=rating_desc&page=1&limit=20
```

## Performance Considerations

### Database Index
A full text search index is created on the following columns:
- `name`
- `description` 
- `product_code`
- `sku_id`

### Query Optimization
- Full text search is used as the primary search method
- LIKE queries are used as fallback for broader matching
- Results are ordered by relevance when using default sorting
- Pagination is implemented to limit result sets

## Migration
To enable full text search, run the migration:
```bash
# SQL Migration
mysql -u username -p database_name < database/migrations/008_add_fulltext_index_products.sql

# Or using Sequelize CLI
npx sequelize-cli db:migrate
```

## Testing
Use the provided test script to verify the search functionality:
```bash
node test_search.js
```

## Notes
- Search is case-insensitive
- Special characters in search queries are handled automatically
- Empty or whitespace-only queries will return a 400 error
- The API supports both full text search and traditional LIKE queries for maximum compatibility
