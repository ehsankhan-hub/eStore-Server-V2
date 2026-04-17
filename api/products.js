const express = require("express");
const products = express.Router();
const pool = require("../shared/pool");

// products.get("/", (req, res) => {
//   const mainCategoryId = req.query.maincategoryid;
//   const subCategoryId = req.query.subcategoryid;
//   const keyword = req.query.keyword;

//   let query = "select * from products";
//   let queryParams = [];

//   if (mainCategoryId) {
//     query = `select products.* from products join categories on products.category_id = categories.id where categories.parent_category_id = ?`;
//     queryParams.push(mainCategoryId);

//     if (keyword) {
//       query += ` AND keywords LIKE '%${keyword}%'`;
//     }
//   } else if (subCategoryId) {
//     query += " where category_id = ?";
//     queryParams.push(subCategoryId);
//   }

//   pool.query(query, queryParams, (error, products) => {
//     if (error)
//       res.status(500).send({
//         error: error.code,
//         message: error.message,
//       });
//     else res.status(200).send(products);
//   });
// });
products.get("/", (req, res) => {
  const mainCategoryId = req.query.maincategoryid;
  const subCategoryId = req.query.subcategoryid;
  const keyword = req.query.keyword;

  //let query = "select * from products join product_images on products.id = product_images.product_id";

  //let query = "select * from products";


   let query=`SELECT
p.*,
 CONCAT('$', FORMAT(p.price, 2)) AS price, -- Formats price to string like '$129.99'
 COALESCE(
     (SELECT
         JSON_ARRAYAGG(ordered_images.imageFiles) -- Aggregate the pre-ordered filenames
      FROM
         (SELECT 
              imageFiles -- Select the correct column name
          FROM 
              productimages -- Alias 'pi' used for the actual table
          WHERE 
              product_id = p.id
          ORDER BY 
              display_order ASC -- Order images here, before aggregation
         ) AS ordered_images -- Alias for the subquery that provides ordered images
     ),
     JSON_ARRAY() -- Returns '[]' (empty JSON array string) if no images found
 ) AS galleryImages -- Column will contain image filenames as a JSON array string
FROM
 products p
-- Add WHERE clauses here if you need to filter products, e.g.:
-- WHERE p.id IN (1, 2);
-- ORDER BY p.id ASC; -- Optional: order the final products
`
 
 // Using template literal to insert the product ID.
 // For actual DB calls, use parameterized queries to prevent SQL injection.
 
 // You can then use this string with your database client library.
 console.log("--- Concatenated SQL Query String ---");

 
debugger
 let queryParams = [];

  if (mainCategoryId) {
    query=`SELECT
    p.*,  -- Selects all columns from the products table
    COALESCE(
        (SELECT
            JSON_ARRAYAGG(ordered_images.imageFiles) -- Use the correct image filename column
         FROM
            (SELECT 
                 pi.imageFiles -- Select the actual image filename column
             FROM 
                 productimages pi
             WHERE 
                 pi.product_id = p.id -- Correlate images to the current product
             ORDER BY 
                 pi.display_order ASC -- Order images correctly
            ) AS ordered_images
        ),
        JSON_ARRAY() -- If a product has no images, returns an empty JSON array '[]'
    ) AS galleryImages -- The new column containing the JSON array string of image filenames
FROM
    products p
JOIN
    categories c ON p.category_id = c.id
WHERE
    (c.id = ? OR c.parent_category_id = ?) 
    `;
    //query = `select products.* from products join categories on products.category_id = categories.id where categories.parent_category_id = ?`;
    queryParams.push(mainCategoryId);
    queryParams.push(mainCategoryId);
console.log('mainCategoryId '+mainCategoryId);
    if (keyword) {
      query += ` AND keywords LIKE '%${keyword}%'`;
    }
  } else if (subCategoryId) {
    query += " where category_id = ?";
    queryParams.push(subCategoryId);
  }

// Assuming 'pool', 'query', 'queryParams', and 'res' (Express response object) are defined

pool.query(query, queryParams, (error, rawResultFromDriver) => {
  console.log('queryParams '+queryParams);
  if (error) {
    console.error('Database Query Error:', error);
    // Send JSON error response AND RETURN to stop further execution
    return res.status(500).json({
      message: 'Error fetching data from database.',
      errorDetails: error.message
    });
  }

  // For debugging: Log the raw structure from the driver
  // console.log('Raw result from driver:', JSON.stringify(rawResultFromDriver, null, 2));

  let dataRows;

  // --- Consistently extract the dataRows array ---
  if (Array.isArray(rawResultFromDriver) &&
      rawResultFromDriver.length === 2 &&
      Array.isArray(rawResultFromDriver[0]) && // First element is an array (the rows)
      typeof rawResultFromDriver[1] === 'object' && // Second element is an object
      rawResultFromDriver[1] !== null &&
      (rawResultFromDriver[1].hasOwnProperty('fieldCount') || rawResultFromDriver[1].constructor.name === 'OkPacket' || rawResultFromDriver[1].constructor.name === 'ResultSetHeader')
     ) {
    // This heuristic detects the common [rowsArray, fieldsMetaDataObject] structure
    dataRows = rawResultFromDriver[0];
    console.log('Detected [rows, fields] structure from driver. Extracted rows array.');
  } else if (Array.isArray(rawResultFromDriver)) {
    // Assume rawResultFromDriver is directly the array of rows
    dataRows = rawResultFromDriver;
    console.log('Assuming raw result from driver is the direct rows array.');
  } else {
    console.error('Unexpected result structure from database query. Expected an array or [rows, fields]. Got:', rawResultFromDriver);
    // Send JSON error response AND RETURN
    return res.status(500).json({ message: 'Unexpected data structure from database.' });
  }
  // --- End of dataRows extraction ---


  // Now 'dataRows' should consistently be your array of product rows.
  // Each row in 'dataRows' might be an object like { "product_json": "{\"id\":1,...}" }
  // if your SQL query uses JSON_OBJECT AS product_json.
  // Or it might be objects with individual columns if your SQL is simpler.

  try {
    // This transformation assumes each 'row' in 'dataRows' needs processing,
    // for example, if it contains a 'product_json' string that needs parsing,
    // or if you're building the final structure here.
    // Adjust this map based on the actual structure of objects within 'dataRows'.

    const finalProductsArray = dataRows.map(row => {
      // If your SQL query (like previous ones) created a 'product_json' column with a JSON string:
      if (row ) {
        if (typeof row === 'string') {
          try {
            return JSON.parse(row);
          } catch (e) {
            console.error(`Error parsing product_json for row: ${JSON.stringify(row)}`, e);
            return null; // Or some error object
          }
         } 
         else if (typeof row === 'object') {
         return row; // Already parsed by driver
        }
      }
      // If 'dataRows' are already the final product objects (no 'product_json' key)
      // then you can often just return 'row' directly, or perform other transformations.
      // For now, returning 'row' if 'product_json' isn't found (needs adjustment based on your actual row structure)
      console.warn('Row did not have expected product_json property or was malformed:', row);
      return row; // This might need adjustment based on what 'row' actually is
    }).filter(product => product !== null); // Filter out any nulls from parsing errors

    // For debugging: Log the final array being sent
    // console.log('Final productsArray to be sent to client: ', JSON.stringify(finalProductsArray, null, 2));
    
    res.status(200).json(finalProductsArray);

  } catch (processingError) {
    console.error('Error Processing Data Rows:', processingError);
    // Ensure response isn't sent again if an error was already sent
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Error processing product data.',
        errorDetails: processingError.message
      });
    }
  }
});
  console.log(query);
  // Assuming 'pool', 'query', 'queryParams', 'req', and 'res' are defined in your backend (e.g., Node.js with Express)





// pool.query(query, queryParams, (error, databaseResults) => {
//   if (error) {
//     console.error('Database Query Error:', error);
//     // Send a more informative JSON error response
//     return res.status(500).json({ 
//       message: 'Error fetching data from database.',
//       errorDetails: error.message // Or a more generic error for production
//     });
//   }

//   // For debugging: Log what MySQL actually returned
//   // console.log('Raw databaseResults: ' + JSON.stringify(databaseResults));

//   try {
//     // 'databaseResults' is an array of row objects, e.g.:
//     // [ { product_json: '{"id":1,...}' }, { product_json: '{"id":2,...}' } ]

//     // Transform the databaseResults into the desired array of product objects
//     const productsArray = databaseResults.map(row => {
//       console.log('row.imageFiles_json_string ' + row);
//       if (row) {
//         return row; 
//         //return JSON.parse(row); // Parse the JSON string from the 'product_json' column
//       }
//       // Handle cases where product_json might be null or missing for a row, though unlikely with COALESCE
//       console.warn('Encountered a row without product_json content:', row);
//       return null; 
//     }).filter(product => product !== null); // Filter out any nulls if parsing failed or data was bad

//     // Now 'productsArray' should be like:
//     // [ { id: 1, name: "Jacket", ... }, { id: 2, name: "Purse", ... } ]

//     console.log('Processed products sent to client: ' + JSON.stringify(productsArray, null, 2)); // Pretty print for readability
    
//     // Send the correctly structured array of product objects
//     res.status(200).json(productsArray); // .json() automatically sets Content-Type and stringifies

//   } catch (parseError) {
//     console.error('Error Parsing JSON from database results:', parseError);
//     res.status(500).json({
//       message: 'Error processing product data from database.',
//       errorDetails: parseError.message
//     });
//   }
// });

// Assuming 'pool', 'query', 'queryParams', 'res' are defined in your backend route handler

// pool.query(query, queryParams, (error, databaseFullResult) => {
//   if (error) {
//     console.error('Database Query Error:', error);
//     return res.status(500).json({ 
//       message: 'Error fetching data from database.',
//       errorDetails: error.message
//     });
//   }

//   // For debugging: Log the entire structure returned by the MySQL driver
//   // console.log('Raw databaseFullResult from MySQL: ', JSON.stringify(databaseFullResult, null, 2));

//   // Standard Node.js MySQL drivers often return [rowsArray, fieldsMetaDataObject]
//   // We are interested in the 'rowsArray', which is the first element.
//   if (!Array.isArray(databaseFullResult) || databaseFullResult.length === 0) {
//     console.warn('Query did not return the expected [rows, fields] array, or it was empty.');
//     return res.status(200).json([]); // Return empty array if no data rows structure
//   }
  
//   const actualDataRows = databaseFullResult[0]; // <<<--- KEY CHANGE: Get the array of actual data rows

//   // Ensure actualDataRows is an array before trying to map it
//   if (!Array.isArray(actualDataRows)) {
//     console.error('Expected actualDataRows (databaseFullResult[0]) to be an array, but got:', typeof actualDataRows);
//     // This might happen if the SQL query itself returns an unexpected result or if the driver behaves differently
//     // For instance, if your SQL query returns a single scalar value, actualDataRows might not be an array.
//     // However, for your JSON_OBJECT query returning multiple rows, actualDataRows should be an array.
//     return res.status(500).json({ message: 'Unexpected data structure from database query.' });
//   }

//   try {
//     // Now, map over 'actualDataRows'
//     const productsToReturn = actualDataRows.map(productRow => {
//       // 'productRow' is now an object from your SQL result, e.g., 
//       // { "product_json": "{\"id\":1,...}" } or { "product_json": {id:1,...} } 
//       // (depending on SQL query and driver's auto-parsing)

//       // Your previous log: 'row.imageFiles_json_string ' + row was misleading.
//       // Let's log the actual productRow to see its structure:
//       // console.log('Processing productRow:', JSON.stringify(productRow));

//       if (productRow && productRow) {
//         // If product_json is already an object (driver auto-parsed it)
//         if (typeof productRow === 'object') {
//           return productRow;
//         }
//         // If product_json is a string that needs parsing
//         else if (typeof productRow === 'string') {
//           try {
//             return productRow;
//           } catch (e) {
//             console.error('Failed to parse product_json string from row. Content:', productRow, 'Error:', e);
//             return null; // Mark as null to be filtered out
//           }
//         } else {
//           console.warn('product_json in row was an unexpected type:', typeof productRow, 'Value:', productRow);
//           return null;
//         }
//       }
//       console.warn('Row did not have a truthy product_json property or product_json was missing:', productRow);
//       return null; // Mark as null to be filtered out
//     }).filter(product => product !== null); // Filter out any nulls

//     // For debugging: Log the final array being sent
//     // console.log('Processed productsToReturn to be sent to client: ', JSON.stringify(productsToReturn, null, 2));
    
//     res.status(200).json(productsToReturn);

//   } catch (processingError) {
//     console.error('General Error Processing Database Results:', processingError);
//     res.status(500).json({
//       message: 'Error processing product data after fetching from database.',
//       errorDetails: processingError.message
//     });
//   }
// });

// Assuming 'pool', 'query' (your new JOIN query), 'queryParams', and 'res' are defined
// pool.query(query, queryParams, (error, joinedRows) => {
//   if (error) {
//     console.error('Database Query Error:', error);
//     return res.status(500).json({
//       message: 'Error fetching data from database.',
//       errorDetails: error.message
//     });
//   }

//   // 'joinedRows' is now expected to be an array of flat objects from the JOIN, e.g.:
//   // [
//   //   { id: '1', name: 'Jacket', /* other product cols */ image_filename: 'jacket_front.jpg', /* other image cols */ },
//   //   { id: '1', name: 'Jacket', /* other product cols */ image_filename: 'jacket_side.jpg',  /* other image cols */ },
//   //   { id: '2', name: 'Dress',  /* other product cols */ image_filename: 'dress_main.jpg',   /* other image cols */ }
//   // ]
//   // IMPORTANT: Adjust property names below (e.g., row.id, row.name, row.image_filename)
//   // to match the actual column names returned by your 'SELECT *' JOIN query.
//   // If 'id' is ambiguous, your driver might name it 'products.id' or similar. Check by logging 'joinedRows'.

//   console.log('Raw joinedRows from MySQL:', JSON.stringify(joinedRows, null, 2));

//   if (!Array.isArray(joinedRows)) {
//       console.error('Expected joinedRows to be an array, but got:', typeof joinedRows);
//       return res.status(500).json({ message: 'Unexpected data format from database (not an array).' });
//   }

//   const productsMap = new Map();

//   for (const row of joinedRows) {
//     // Use the correct product identifier column from your 'products' table part of the row
//     const productId = row.id; // Or row['products.id'] or however your driver names it

//     if (!productsMap.has(productId)) {
//       // This is the first time we're seeing this product, so create its main entry
//       productsMap.set(productId, {
//         id: productId,
//         name: row.name, // Assuming 'name' comes from products table
//         product_description: row.product_description,
//         price: row.price ? `$${parseFloat(row.price).toFixed(2)}` : null, // Format price, handle null
//         ratings: row.ratings,
//         category_id: row.category_id,
//         product_img: row.product_img, // Assuming 'product_img' is your main image identifier column in Products table
//         keywords: row.keywords,
//         //galleryImages: [] // Initialize galleryImages as an empty array
//       });
//     }

//     // Add the current row's image to this product's galleryImages array
//     // Ensure 'image_filename' is the correct column name from your 'product_images' table
//     if (row.image_filename) { // Check if there's an image in this particular joined row
//       productsMap.get(productId).galleryImages.push({
//         // 'id' here would be the product_images table's primary key for the image, if you need it
//         // id: row.image_id, // Assuming 'image_id' is a column in product_images
//         src: row.image_filename,
//         alt: row.alt_text || `${productsMap.get(productId).name} - Image` // Assuming 'alt_text' might exist in product_images
//         // 'product_img_id' inside subImages was from your old JSON structure, 
//         // decide if it's still needed here. It typically refers to the main product image.
//         // product_img_id: productsMap.get(productId).product_img_id
//       });
//     }
//   }

//   // Convert the map of products to an array
//   const finalProductsArray = Array.from(productsMap.values());

//   // Optional: Sort galleryImages within each product if your SQL ORDER BY wasn't specific enough
//   // or if you didn't include product_images.display_order in your SELECT * and JOIN.
//   // For example, if product_images had a 'display_order' column:
//   // finalProductsArray.forEach(product => {
//   //   if (product.galleryImages) {
//   //     product.galleryImages.sort((a, b) => a.display_order - b.display_order); // Assuming 'a' and 'b' have display_order
//   //   }
//   // });

//   console.log('Processed productsArray to be sent to client: ', JSON.stringify(finalProductsArray, null, 2));
//   res.status(200).json(finalProductsArray);
// });

});

// products.get("/:id", (req, res) => {
//   let id = req.params.id;
//   pool.query("select * from products where id = ?", [id], (error, products) => {
//     if (error)
//       res.status(500).send({
//         error: error.code,
//         message: error.message,
//       });
//     else res.status(200).send(products);
//   });
// });

products.get("/:id", (req, res) => {
  let id = req.params.id;
  let query = `SELECT
  p.*,
  COALESCE(
      (SELECT
          JSON_ARRAYAGG(ordered_images.imageFiles)
       FROM
          (SELECT 
               pi.imageFiles
           FROM 
               productimages pi
           WHERE 
               pi.product_id = p.id
           ORDER BY 
               pi.display_order ASC
          ) AS ordered_images
      ),
      JSON_ARRAY()
  ) AS galleryImages
FROM
  products p WHERE 
  p.id = ?`;
  
  pool.query(query, [id], (error, rawResultFromDriver) => {
    if (error) {
      console.error('Database Query Error:', error);
      return res.status(500).json({
        message: 'Error fetching product data from database.',
        errorDetails: error.message
      });
    }

    // Extract data rows from the result
    let dataRows;
    if (Array.isArray(rawResultFromDriver) &&
        rawResultFromDriver.length === 2 &&
        Array.isArray(rawResultFromDriver[0]) &&
        typeof rawResultFromDriver[1] === 'object' &&
        rawResultFromDriver[1] !== null &&
        (rawResultFromDriver[1].hasOwnProperty('fieldCount') || rawResultFromDriver[1].constructor.name === 'OkPacket' || rawResultFromDriver[1].constructor.name === 'ResultSetHeader')
       ) {
      dataRows = rawResultFromDriver[0];
    } else if (Array.isArray(rawResultFromDriver)) {
      dataRows = rawResultFromDriver;
    } else {
      console.error('Unexpected result structure from database query. Expected an array or [rows, fields]. Got:', rawResultFromDriver);
      return res.status(500).json({ message: 'Unexpected data structure from database.' });
    }

    // Process the data
    try {
      const finalProductsArray = dataRows.map(row => {
        if (row && typeof row === 'object') {
          return row; // Already parsed by driver
        }
        console.warn('Row did not have expected structure:', row);
        return row;
      }).filter(product => product !== null);

      console.log('Single product result:', JSON.stringify(finalProductsArray, null, 2));
      res.status(200).json(finalProductsArray);

    } catch (processingError) {
      console.error('Error Processing Product Data:', processingError);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error processing product data.',
          errorDetails: processingError.message
        });
      }
    }
  });
});


module.exports = products;
