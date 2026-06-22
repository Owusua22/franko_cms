import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllProducts } from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import {
  Button,
  Table,
  message,
  Input,
  Modal,
  Tooltip,
  Tag,
  Card,
  Space,
  Select,
  Row,
  Col,
  Statistic,
  Avatar,
  Empty,
} from "antd";
import {
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ShopOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import AddProduct from "./AddProduct";
import UpdateProduct from "./EditProduct";
import UpdateProductImage from "./UpdateProductImage";

const { Option } = Select;

const backendBaseURL = "https://cms.frankotrading.com";

const getProductId = (product) =>
  product?.productID || product?.Productid || product?.ProductID;

const getProductName = (product) =>
  product?.productName || product?.ProductName || "";

const getProductImage = (product) =>
  product?.productImage || product?.ProductImage || "";

const getDescription = (product) =>
  product?.description || product?.Description || "";

const getPrice = (product) => product?.price ?? product?.Price ?? 0;

const getOldPrice = (product) => product?.oldPrice ?? product?.OldPrice ?? 0;

const getBrandName = (product) =>
  product?.brandName || product?.BrandName || "";

const getCategoryName = (product) =>
  product?.categoryName || product?.CategoryName || "";

const getShowroomName = (product) =>
  product?.showRoomName || product?.ShowRoomName || "";

const getStatus = (product) => product?.status ?? product?.Status;

const getDateCreated = (product) =>
  product?.dateCreated || product?.DateCreated || "";

const AdminProducts = () => {
  const dispatch = useDispatch();

  const { products = [], loading: productsLoading } = useSelector(
    (state) => state.products || {}
  );

  const { brands = [], loading: brandsLoading } = useSelector(
    (state) => state.brands || {}
  );

  const { showrooms = [], loading: showroomsLoading } = useSelector(
    (state) => state.showrooms || {}
  );

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isDescriptionModalVisible, setIsDescriptionModalVisible] =
    useState(false);
  const [isUpdateImageModalVisible, setIsUpdateImageModalVisible] =
    useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForImage, setSelectedProductForImage] = useState(null);
  const [fullImageUrl, setFullImageUrl] = useState("");
  const [descriptionText, setDescriptionText] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterBrand, setFilterBrand] = useState(undefined);
  const [filterShowroom, setFilterShowroom] = useState(undefined);
  const [filterStock, setFilterStock] = useState("all");
  const [refreshLoading, setRefreshLoading] = useState(false);

  const isLoading =
    productsLoading || brandsLoading || showroomsLoading || refreshLoading;

  const getImageUrl = useCallback((imagePath) => {
    if (!imagePath) return "";

    const fileName = String(imagePath).split("\\").pop().split("/").pop();

    return `${backendBaseURL}/Media/Products_Images/${fileName}`;
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchShowrooms()).unwrap(),
      ]);
    } catch (error) {
      message.error("Failed to load product data");
    }
  }, [dispatch]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);

    try {
      await Promise.all([
        dispatch(fetchAllProducts()).unwrap(),
        dispatch(fetchBrands()).unwrap(),
        dispatch(fetchShowrooms()).unwrap(),
      ]);

      message.success("Data refreshed successfully");
    } catch (error) {
      message.error("Failed to refresh data");
    } finally {
      setRefreshLoading(false);
    }
  }, [dispatch]);

  const { filteredProducts, productStats } = useMemo(() => {
    const sourceProducts = Array.isArray(products) ? products : [];
    const q = searchText.trim().toLowerCase();

    const filtered = sourceProducts.filter((product) => {
      const searchMatch =
        !q ||
        [
          getProductName(product),
          getShowroomName(product),
          getBrandName(product),
          getCategoryName(product),
          getDescription(product),
          getProductId(product),
        ].some((field) => String(field ?? "").toLowerCase().includes(q));

      const brandMatch = !filterBrand || getBrandName(product) === filterBrand;

      const showroomMatch =
        !filterShowroom || getShowroomName(product) === filterShowroom;

      let stockMatch = true;

      if (filterStock === "in_stock") {
        stockMatch = getStatus(product) == 1;
      }

      if (filterStock === "out_of_stock") {
        stockMatch = getStatus(product) == 0;
      }

      return searchMatch && brandMatch && showroomMatch && stockMatch;
    });

    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(getDateCreated(b) || 0) - new Date(getDateCreated(a) || 0)
    );

    const stats = {
      total: sourceProducts.length,
      filtered: filtered.length,
      inStock: sourceProducts.filter((p) => getStatus(p) == 1).length,
      outOfStock: sourceProducts.filter((p) => getStatus(p) == 0).length,
    };

    return { filteredProducts: sorted, productStats: stats };
  }, [products, searchText, filterBrand, filterShowroom, filterStock]);

  const handleModalClose = useCallback(
    async (setter, shouldRefresh = false) => {
      setter(false);

      if (shouldRefresh) {
        try {
          await dispatch(fetchAllProducts()).unwrap();
        } catch {
          message.error("Failed to refresh products");
        }
      }
    },
    [dispatch]
  );

  const handleAddProduct = useCallback(() => {
    setSelectedProduct(null);
    setIsAddModalVisible(true);
  }, []);

  const handleUpdateProduct = useCallback((product) => {
    setSelectedProduct(product);
    setIsUpdateModalVisible(true);
  }, []);

  const handleUpdateProductImage = useCallback((product) => {
    if (!product) {
      message.warning("No product selected");
      return;
    }

    setSelectedProductForImage(product);
    setIsUpdateImageModalVisible(true);
  }, []);

  const handleViewProductDetails = useCallback((product) => {
    setSelectedProduct(product);
    setIsDetailModalVisible(true);
  }, []);

  const handleDescriptionClick = useCallback((description) => {
    setDescriptionText(description || "");
    setIsDescriptionModalVisible(true);
  }, []);

  const handlePreviewImage = useCallback(
    (imagePath) => {
      const imageUrl = getImageUrl(imagePath);

      if (!imageUrl) {
        message.warning("No image found for this product");
        return;
      }

      setFullImageUrl(imageUrl);
      setIsImagePreviewVisible(true);
    },
    [getImageUrl]
  );

  const exportToExcel = useCallback(() => {
    try {
      const exportData = filteredProducts.map((product, index) => ({
        "S/N": index + 1,
        "Product Name": getProductName(product),
        "Product ID": getProductId(product) || "",
        Description: getDescription(product),
        "Price (₵)": parseFloat(getPrice(product) || 0).toFixed(2),
        "Old Price (₵)": getOldPrice(product)
          ? parseFloat(getOldPrice(product)).toFixed(2)
          : "",
        Brand: getBrandName(product),
        Category: getCategoryName(product),
        Showroom: getShowroomName(product),
        Status: getStatus(product) == 1 ? "In Stock" : "Out of Stock",
        "Date Created": getDateCreated(product)
          ? new Date(getDateCreated(product)).toLocaleDateString()
          : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 16 },
        { wch: 40 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Products");

      const currentDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `products_export_${currentDate}.xlsx`);

      message.success("Products exported successfully");
    } catch (error) {
      message.error("Failed to export products");
    }
  }, [filteredProducts]);

  const columns = useMemo(
    () => [
      {
        title: "Image",
        dataIndex: "productImage",
        key: "productImage",
        width: 80,
        fixed: "left",
        render: (_, record) => {
          const imagePath = getProductImage(record);
          const imageUrl = getImageUrl(imagePath);

          return (
            <Avatar
              src={imageUrl}
              size={50}
              shape="square"
              style={{ cursor: "pointer", border: "1px solid #f0f0f0" }}
              onClick={() => handlePreviewImage(imagePath)}
            />
          );
        },
      },
      {
        title: "Product Details",
        key: "productDetails",
        width: 240,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {getProductName(record) || "-"}
            </div>

            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              ID: {getProductId(record) || "-"}
            </div>

            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              {getDateCreated(record)
                ? new Date(getDateCreated(record)).toLocaleDateString()
                : "-"}
            </div>
          </div>
        ),
      },
      {
        title: "Price",
        key: "price",
        width: 120,
        render: (_, record) => {
          const price = getPrice(record);
          const oldPrice = getOldPrice(record);

          return (
            <div>
              <div style={{ fontWeight: 600, color: "#ff4d4f" }}>
                ₵
                {parseFloat(price || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {Number(oldPrice) > 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#999",
                    textDecoration: "line-through",
                  }}
                >
                  ₵
                  {parseFloat(oldPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Brand & Category",
        key: "brandCategory",
        width: 160,
        render: (_, record) => (
          <div>
            <Tag color="red" style={{ marginBottom: 4 }}>
              {getBrandName(record) || "-"}
            </Tag>
            <br />
            <Tag color="orange">{getCategoryName(record) || "-"}</Tag>
          </div>
        ),
      },
      {
        title: "Showroom",
        key: "showRoomName",
        width: 150,
        render: (_, record) => {
          const showroomName = getShowroomName(record);

          return (
            <Tag color={showroomName === "Products out of stock" ? "red" : "green"}>
              {showroomName || "-"}
            </Tag>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render: (_, record) => {
          const status = getStatus(record);

          return (
            <Tag color={status == 1 ? "success" : "error"}>
              {status == 1 ? "In Stock" : "Out of Stock"}
            </Tag>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 130,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Edit Product">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleUpdateProduct(record)}
              />
            </Tooltip>

            <Tooltip title="Update Image">
              <Button
                type="text"
                icon={<UploadOutlined />}
                onClick={() => handleUpdateProductImage(record)}
              />
            </Tooltip>

            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewProductDetails(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [
      getImageUrl,
      handlePreviewImage,
      handleUpdateProduct,
      handleUpdateProductImage,
      handleViewProductDetails,
    ]
  );

  return (
    <div
      style={{ minHeight: "100vh" }}
      className="min-h-screen overflow-y-auto px-4 py-6 bg-white"
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#262626",
            margin: 0,
            marginBottom: 4,
          }}
        >
          Products Management
        </h1>

        <p style={{ color: "#8c8c8c", margin: 0 }}>
          Manage your product inventory, pricing, and availability
        </p>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Total Products"
              value={productStats.total}
              prefix={<TagsOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="In Stock"
              value={productStats.inStock}
              valueStyle={{ color: "#3f8600" }}
              prefix={<ShopOutlined style={{ color: "#3f8600" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Out of Stock"
              value={productStats.outOfStock}
              valueStyle={{ color: "#cf1322" }}
              prefix={<ShopOutlined style={{ color: "#cf1322" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search products, brands, categories, showrooms..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Brand"
              style={{ width: "100%" }}
              value={filterBrand}
              onChange={setFilterBrand}
              allowClear
            >
              {(Array.isArray(brands) ? brands : []).map((brand) => (
                <Option
                  key={brand.brandId || brand.brandID || brand.brandName}
                  value={brand.brandName}
                >
                  {brand.brandName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Filter by Showroom"
              style={{ width: "100%" }}
              value={filterShowroom}
              onChange={setFilterShowroom}
              allowClear
            >
              {(Array.isArray(showrooms) ? showrooms : []).map((showroom) => (
                <Option
                  key={
                    showroom.showRoomId ||
                    showroom.showRoomID ||
                    showroom.showRoomName
                  }
                  value={showroom.showRoomName}
                >
                  {showroom.showRoomName}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Stock Status"
              style={{ width: "100%" }}
              value={filterStock}
              onChange={setFilterStock}
            >
              <Option value="all">All Products</Option>
              <Option value="in_stock">In Stock Only</Option>
              <Option value="out_of_stock">Out of Stock Only</Option>
            </Select>
          </Col>

          <Col xs={24} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddProduct}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Add Product
            </Button>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={refreshLoading}
              >
                Refresh
              </Button>

              <Button
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                disabled={!filteredProducts.length}
                type="dashed"
              >
                Export Excel
              </Button>
            </Space>
          </Col>

          <Col style={{ marginLeft: "auto" }}>
            <span style={{ color: "#8c8c8c" }}>
              Showing {productStats.filtered} of {productStats.total} products
            </span>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey={(record) => getProductId(record)}
          loading={isLoading}
          scroll={{ x: 1100 }}
          locale={{ emptyText: <Empty description="No products found" /> }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["10", "15", "25", "50"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} products`,
          }}
          size="small"
        />
      </Card>

      <AddProduct
        visible={isAddModalVisible}
        onClose={() => handleModalClose(setIsAddModalVisible, true)}
      />

      <UpdateProduct
        visible={isUpdateModalVisible}
        onClose={() => handleModalClose(setIsUpdateModalVisible, true)}
        product={selectedProduct || {}}
      />

      <UpdateProductImage
        visible={isUpdateImageModalVisible}
        onClose={() => handleModalClose(setIsUpdateImageModalVisible, true)}
        product={selectedProductForImage}
        productID={getProductId(selectedProductForImage)}
      />

      <Modal
        open={isImagePreviewVisible}
        onCancel={() => setIsImagePreviewVisible(false)}
        footer={null}
        title="Product Image"
        width={600}
        centered
      >
        <img
          src={fullImageUrl}
          alt="Full Product"
          style={{ width: "100%", height: "auto", borderRadius: 8 }}
        />
      </Modal>

      <Modal
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        centered
        width={700}
        title="Product Details"
      >
        {selectedProduct && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img
                src={getImageUrl(getProductImage(selectedProduct))}
                alt={getProductName(selectedProduct)}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {getProductName(selectedProduct)}
            </h2>

            <Row gutter={[16, 12]}>
              <Col span={12}>
                <strong>Product ID:</strong> {getProductId(selectedProduct) || "-"}
              </Col>

              <Col span={12}>
                <strong>Category:</strong>{" "}
                {getCategoryName(selectedProduct) || "-"}
              </Col>

              <Col span={12}>
                <strong>Brand:</strong> {getBrandName(selectedProduct) || "-"}
              </Col>

              <Col span={12}>
                <strong>Showroom:</strong>{" "}
                {getShowroomName(selectedProduct) || "-"}
              </Col>

              <Col span={12}>
                <strong>Date Created:</strong>{" "}
                {getDateCreated(selectedProduct)
                  ? new Date(getDateCreated(selectedProduct)).toLocaleDateString()
                  : "-"}
              </Col>

              <Col span={12}>
                <strong>Status:</strong>
                <Tag
                  color={getStatus(selectedProduct) == 1 ? "success" : "error"}
                  style={{ marginLeft: 8 }}
                >
                  {getStatus(selectedProduct) == 1
                    ? "In Stock"
                    : "Out of Stock"}
                </Tag>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#ff4d4f",
                    marginRight: 16,
                  }}
                >
                  ₵
                  {parseFloat(getPrice(selectedProduct) || 0).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 }
                  )}
                </span>

                {Number(getOldPrice(selectedProduct)) > 0 && (
                  <span
                    style={{
                      fontSize: 16,
                      textDecoration: "line-through",
                      color: "#999",
                    }}
                  >
                    ₵
                    {parseFloat(getOldPrice(selectedProduct)).toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                )}
              </div>
            </div>

            <div>
              <strong>Description:</strong>
              <p
                style={{
                  marginTop: 8,
                  lineHeight: 1.6,
                  color: "#666",
                  cursor: "pointer",
                }}
                onClick={() =>
                  handleDescriptionClick(getDescription(selectedProduct))
                }
              >
                {getDescription(selectedProduct) || "No description"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isDescriptionModalVisible}
        onCancel={() => setIsDescriptionModalVisible(false)}
        footer={null}
        title="Product Description"
        width={700}
      >
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {descriptionText}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProducts;