import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Upload,
  Row,
  Col,
  Divider,
  Typography,
  Space,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import { addProduct, fetchAllProducts } from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import { fetchCategories } from "../../../Redux/Slice/categorySlice";

const { Option } = Select;
const { Title } = Typography;

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toRequiredString = (value, fallback = "") => {
  const stringValue = String(value ?? "").trim();
  return stringValue || fallback;
};

const AddProduct = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [brandSearchValue, setBrandSearchValue] = useState("");
  const [showroomSearchValue, setShowroomSearchValue] = useState("");
  const [categorySearchValue, setCategorySearchValue] = useState("");

  const brands = useSelector((state) => state.brands?.brands || []);
  const showrooms = useSelector((state) => state.showrooms?.showrooms || []);
  const categories = useSelector((state) => state.categories?.categories || []);

  const brandsLoading = useSelector((state) => state.brands?.loading);
  const showroomsLoading = useSelector((state) => state.showrooms?.loading);
  const categoriesLoading = useSelector((state) => state.categories?.loading);

  useEffect(() => {
    if (visible) {
      dispatch(fetchBrands());
      dispatch(fetchShowrooms());
      dispatch(fetchCategories());
    }
  }, [dispatch, visible]);

  const filteredBrands = useMemo(() => {
    const list = Array.isArray(brands) ? brands : [];

    if (!brandSearchValue) return list;

    return list.filter((brand) =>
      String(brand.brandName || "")
        .toLowerCase()
        .includes(brandSearchValue.toLowerCase())
    );
  }, [brands, brandSearchValue]);

  const filteredShowrooms = useMemo(() => {
    const list = Array.isArray(showrooms) ? showrooms : [];

    if (!showroomSearchValue) return list;

    return list.filter((showroom) =>
      String(showroom.showRoomName || "")
        .toLowerCase()
        .includes(showroomSearchValue.toLowerCase())
    );
  }, [showrooms, showroomSearchValue]);

  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];

    if (!categorySearchValue) return list;

    return list.filter((category) =>
      String(category.categoryName || "")
        .toLowerCase()
        .includes(categorySearchValue.toLowerCase())
    );
  }, [categories, categorySearchValue]);

  const handleReset = () => {
    form.resetFields();
    setProductImageFile(null);
    setImagePreview(null);
    setBrandSearchValue("");
    setShowroomSearchValue("");
    setCategorySearchValue("");
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const onFinish = async (values) => {
    if (!productImageFile) {
      message.error("Please upload a product image.");
      return;
    }

    const productId2 = uuidv4();
    const productId3 = values.productId3?.trim() || uuidv4();

    const apiValues = {
      productName: toRequiredString(values.productName),
      description: toRequiredString(values.description),

      price: toNumber(values.price),
      oldPrice: toNumber(values.oldPrice),

      brandId: toRequiredString(values.brandId),
      showRoomId: toRequiredString(values.showRoomId),

      // Backend requires string.
      status: String(values.status ?? "0"),

      tag: toRequiredString(values.tag),
      Color: toRequiredString(values.Color),

      // Required by backend.
      // This is hidden/internal, not branch product code.
      productId2,
      productId3,

      productDiscount: toNumber(values.productDiscount),

      // Keep these only if your backend accepts/uses them.
      categoryId: values.categoryId,
      quantity: toNumber(values.quantity),

      ProductID: uuidv4(),
      DateCreated: new Date().toISOString(),
      Userid: "user-uuid",
    };

    const formData = new FormData();

    Object.entries(apiValues).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    formData.append("ProductImage", productImageFile);

    try {
      setSubmitting(true);

      await dispatch(addProduct(formData)).unwrap();

      await dispatch(fetchAllProducts()).unwrap();

      message.success("Product added successfully!");
      handleReset();
      onClose();
    } catch (err) {
      console.error("Failed to add product:", err);

      if (typeof err === "string") {
        message.error(err);
      } else if (err?.title) {
        message.error(err.title);
      } else if (err?.errors) {
        const msgs = Object.values(err.errors).flat();
        message.error(msgs.join(", "));
      } else {
        message.error("Failed to add product.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith("image/");

      if (!isImage) {
        message.error("You can only upload image files!");
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;

      if (!isLt5M) {
        message.error("Image must be smaller than 5MB!");
        return false;
      }

      setProductImageFile(file);
      setImagePreview(URL.createObjectURL(file));

      return false;
    },
    showUploadList: false,
    accept: "image/*",
  };

  return (
    <Modal
      title={<Title level={4}>Add New Product</Title>}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={850}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          status: "1",
          oldPrice: 0,
          productDiscount: 0,
          quantity: 0,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Form.Item
              name="productName"
              label="Product Name"
              rules={[
                { required: true, message: "Please enter the product name." },
                {
                  min: 3,
                  message: "Product name must be at least 3 characters.",
                },
              ]}
            >
              <Input placeholder="e.g., Samsung TV 55 inch" size="large" />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Form.Item
              name="price"
              label="Price (₵)"
              rules={[
                { required: true, message: "Please enter the price." },
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={4}>
            <Form.Item
              name="oldPrice"
              label="Old Price (₵)"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid price.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="productDiscount"
              label="Discount (₵)"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Enter a valid discount.",
                },
              ]}
            >
              <Input
                type="number"
                prefix="₵"
                placeholder="0.00"
                min="0"
                step="0.01"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: "Please enter the quantity." },
                {
                  pattern: /^\d+$/,
                  message: "Please enter a valid number.",
                },
              ]}
            >
              <Input
                type="number"
                placeholder="Enter quantity"
                min="0"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="Color"
              label="Color"
              rules={[{ required: true, message: "Please enter the color." }]}
            >
              <Input placeholder="e.g., Red, Blue" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              name="tag"
              label="Tag"
              rules={[{ required: true, message: "Please enter a tag." }]}
            >
              <Input placeholder="e.g., Trending" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Please select the status." }]}
            >
              <Select placeholder="Select stock status" size="large">
                <Option value="1">In Stock</Option>
                <Option value="0">Out of Stock</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="productId3"
              label="MPN"
              tooltip="Manufacturer Part Number. Auto-generated if empty."
            >
              <Input placeholder="Enter MPN" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: "Please input the description!" },
            {
              min: 10,
              message: "Description must be at least 10 characters.",
            },
          ]}
        >
          <Input.TextArea
            placeholder="Enter product description"
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="brandId"
              label="Brand"
              rules={[{ required: true, message: "Please select a brand." }]}
            >
              <Select
                placeholder="Select or search brand"
                showSearch
                filterOption={false}
                onSearch={setBrandSearchValue}
                loading={brandsLoading}
                notFoundContent={brandsLoading ? "Loading..." : "No brands found"}
                size="large"
              >
                {filteredBrands.map((brand) => {
                  const id = brand.brandId ?? brand.brandID;

                  return (
                    <Option key={id} value={id}>
                      {brand.brandName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="showRoomId"
              label="Showroom"
              rules={[
                { required: true, message: "Please select a showroom." },
              ]}
            >
              <Select
                placeholder="Select or search showroom"
                showSearch
                filterOption={false}
                onSearch={setShowroomSearchValue}
                loading={showroomsLoading}
                notFoundContent={
                  showroomsLoading ? "Loading..." : "No showrooms found"
                }
                size="large"
              >
                {filteredShowrooms.map((room) => {
                  const id = room.showRoomId ?? room.showRoomID;

                  return (
                    <Option key={id} value={id}>
                      {room.showRoomName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[
                { required: true, message: "Please select a category." },
              ]}
            >
              <Select
                placeholder="Select or search category"
                showSearch
                filterOption={false}
                onSearch={setCategorySearchValue}
                loading={categoriesLoading}
                notFoundContent={
                  categoriesLoading ? "Loading..." : "No categories found"
                }
                size="large"
              >
                {filteredCategories.map((category) => {
                  const id = category.categoryId ?? category.categoryID;

                  return (
                    <Option key={id} value={id}>
                      {category.categoryName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Product Image" name="productImage">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload>

          {imagePreview && (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #e5e5e5",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <img
                src={imagePreview}
                alt="Product Preview"
                style={{
                  width: "100%",
                  maxHeight: 250,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            </div>
          )}
        </Form.Item>

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button size="large" onClick={handleModalClose} disabled={submitting}>
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              size="large"
              style={{
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
              }}
            >
              Add Product
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

AddProduct.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddProduct;