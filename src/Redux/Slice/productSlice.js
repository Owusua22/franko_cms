// productSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

/* ===========================
   ASYNC THUNKS
=========================== */

// Add Product
export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", productData, {
        params: { endpoint: "/Product/Product-Post" },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to add product"
      );
    }
  }
);

// Update Product
export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const { Productid, ...restData } = productData;

      const response = await axiosInstance.post("/", restData, {
        params: { endpoint: `/Product/Product_Put/${Productid}` },
        headers: {
          accept: "text/plain",
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to update product"
      );
    }
  }
);

// Update Product Image
export const updateProductImage = createAsyncThunk(
  "products/updateProductImage",
  async ({ productID, imageFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("ProductId", productID);
      formData.append("ImageName", imageFile);

      const response = await axiosInstance.post("/", formData, {
        params: { endpoint: "/Product/Product-Image-Edit" },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to update product image"
      );
    }
  }
);

// Fetch All Products
export const fetchAllProducts = createAsyncThunk(
  "products/fetchAllProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      return products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch all products"
      );
    }
  }
);

// Fetch Active Products Only
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const filteredProducts = products
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

      return filteredProducts;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch products"
      );
    }
  }
);

// Fetch Most Recent 24 Active Products
export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const filteredProducts = products
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 24);

      return filteredProducts;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch product"
      );
    }
  }
);

// Fetch Paginated Products
export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 24 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-Paginated",
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const validProducts = products.filter(
        (p) => new Date(p.dateCreated).getFullYear() > 2000
      );

      const invalidProducts = products.filter(
        (p) => new Date(p.dateCreated).getFullYear() <= 2000
      );

      const sortedValid = validProducts.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return [...sortedValid, ...invalidProducts];
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch paginated products"
      );
    }
  }
);

// Fetch Paginated Products By Showroom
export const fetchPaginatedProductsByShowroom = createAsyncThunk(
  "products/fetchPaginatedProductsByShowroom",
  async ({ showroomCode, pageNumber, pageSize = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom-Pageinated",
          Code: showroomCode,
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const sorted = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return { showroomCode, products: sorted };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch paginated showroom products"
      );
    }
  }
);

// Fetch Products By Category
export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Category/${categoryId}`,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      return { categoryId, products };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products by category"
      );
    }
  }
);

// Fetch Products By Brand
export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (brandId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Brand/${brandId}`,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      return products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch products by brand"
      );
    }
  }
);

// Fetch Products By Showroom
export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (showRoomID, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-ShowRoom/${showRoomID}`,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const sortedProducts = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return { showRoomID, products: sortedProducts };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products by showroom"
      );
    }
  }
);

// Fetch Product By ID
export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Product_ID/${productId}`,
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch product by ID"
      );
    }
  }
);

// Fetch Active Products
export const fetchActiveProducts = createAsyncThunk(
  "products/fetchActiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-Active",
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch active products"
      );
    }
  }
);

// Fetch Inactive Products
export const fetchInactiveProducts = createAsyncThunk(
  "products/fetchInactiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-0",
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch inactive products"
      );
    }
  }
);

// Fetch Product By Showroom And Record Number
export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom_RecordNumber",
          ShowRommCode: showRoomCode,
          RecordNumber: recordNumber,
        },
      });

      const products = Array.isArray(response.data) ? response.data : [];

      const sortedProducts = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );

      return { showRoomCode, products: sortedProducts };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch product by showroom and record number"
      );
    }
  }
);

/* ===========================
   SLICE
=========================== */

const productSlice = createSlice({
  name: "products",

  initialState: {
    products: [],
    currentPage: 1,
    filteredProducts: [],
    brandProducts: [],
    productsByShowroom: {},
    productsByCategory: {},
    currentProduct: null,
    activeProducts: [],
    inactiveProducts: [],
    loading: false,
    error: null,
  },

  reducers: {
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },

    clearProducts: (state) => {
      state.products = [];
      state.filteredProducts = [];
      state.productsByShowroom = {};
      state.currentProduct = null;
      state.error = null;
    },

    resetProducts: (state) => {
      state.products = [];
    },

    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Add Product
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;

        const updatedProduct = action.payload;

        const index = state.products.findIndex(
          (item) =>
            item.Productid == updatedProduct.productID ||
            item.productID == updatedProduct.productID ||
            item.Productid == updatedProduct.Productid ||
            item.productID == updatedProduct.Productid
        );

        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product Image
      .addCase(updateProductImage.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProductImage.fulfilled, (state, action) => {
        state.loading = false;

        const updatedProduct = action.payload;

        const index = state.products.findIndex(
          (item) =>
            item.Productid === updatedProduct.Productid ||
            item.productID === updatedProduct.productID ||
            item.Productid === updatedProduct.productID ||
            item.productID === updatedProduct.Productid
        );

        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
      })
      .addCase(updateProductImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Brand
      .addCase(fetchProductsByBrand.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brandProducts = action.payload;
      })
      .addCase(fetchProductsByBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product Recent 24
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch All Products
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Category
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.productsByCategory[action.payload.categoryId] =
          action.payload.products;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Showroom
      .addCase(fetchProductsByShowroom.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;

        const { showRoomID, products } = action.payload;
        state.productsByShowroom[showRoomID] = products;
      })
      .addCase(fetchProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product By ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Paginated Products
      .addCase(fetchPaginatedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaginatedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchPaginatedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Paginated Products By Showroom
      .addCase(fetchPaginatedProductsByShowroom.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaginatedProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;

        const { showroomCode, products } = action.payload;
        state.productsByShowroom[showroomCode] = products;
      })
      .addCase(fetchPaginatedProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Active Products
      .addCase(fetchActiveProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.activeProducts = action.payload;
      })
      .addCase(fetchActiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Inactive Products
      .addCase(fetchInactiveProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInactiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.inactiveProducts = action.payload;
      })
      .addCase(fetchInactiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product By Showroom And Record
      .addCase(fetchProductByShowroomAndRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductByShowroomAndRecord.fulfilled, (state, action) => {
        state.loading = false;

        const { showRoomCode, products } = action.payload;
        state.productsByShowroom[showRoomCode] = products;
      })
      .addCase(fetchProductByShowroomAndRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  clearProducts,
  setPage,
  clearCurrentProduct,
  resetProducts,
} = productSlice.actions;

export default productSlice.reducer;