import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateProduct,
  fetchAllProducts,
} from "../../../Redux/Slice/productSlice";
import { fetchBrands } from "../../../Redux/Slice/brandSlice";
import { fetchShowrooms } from "../../../Redux/Slice/showRoomSlice";
import { fetchCategories } from "../../../Redux/Slice/categorySlice";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  message,
  Row,
  Col,
  Typography,
  Divider,
  Space,
} from "antd";
import PropTypes from "prop-types";
import { v4 as uuidv4 } from "uuid";

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

const getFirstValue = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
};

const getProductId = (product) => {
  return product?.Productid || product?.productID || product?.ProductID;
};

const UpdateProduct = ({ visible, onClose, product }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!visible || !product || Object.keys(product).length === 0) return;

    const formValues = {
      Productid: getProductId(product),

      productName: product.productName ?? product.ProductName ?? "",
      description: product.description ?? product.Description ?? "",

      price: product.price ?? product.Price ?? 0,
      oldPrice: product.oldPrice ?? product.OldPrice ?? 0,

      productDiscount:
        product.productDiscount ??
        product.ProductDiscount ??
        product.product_Dicount ??
        0,

      brandId: product.brandId ?? product.BrandId ?? product.brandID,
      showRoomId:
        product.showRoomId ?? product.ShowRoomId ?? product.showRoomID,
      categoryId:
        product.categoryId ?? product.CategoryId ?? product.categoryID,

      status: String(product.status ?? product.Status ?? "0"),

      tag: product.tag ?? product.Tag ?? "",
      productColor:
        product.productColor ?? product.Color ?? product.color ?? "",

      quantity: product.quantity ?? product.Quantity ?? 0,

      // Hidden required backend field.
      // This is NOT branch product code anymore.
      productId2: product.productId2 ?? product.ProductId2 ?? "",

      productId3: product.productId3 ?? product.ProductId3 ?? "",
    };

    form.setFieldsValue(formValues);
  }, [visible, product, form]);

  const handleReset = () => {
    form.resetFields();
    setBrandSearchValue("");
    setShowroomSearchValue("");
    setCategorySearchValue("");
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  const onFinish = async (values) => {
    const productId = values.Productid;

    if (!productId) {
      message.error("Product ID is missing!");
      return;
    }

    const productId2 = getFirstValue(
      values.productId2,
      product?.productId2,
      product?.ProductId2,
      uuidv4()
    );

    const productId3 = getFirstValue(
      values.productId3,
      product?.productId3,
      product?.ProductId3,
      uuidv4()
    );

    const payload = {
      Productid: productId,

      productName: toRequiredString(values.productName),
      description: toRequiredString(values.description),

      price: toNumber(values.price),
      oldPrice: toNumber(values.oldPrice),

      brandId: toRequiredString(values.brandId),
      showRoomId: toRequiredString(values.showRoomId),

      // Backend requires string.
      status: String(values.status ?? "0"),

      tag: toRequiredString(values.tag),
      productColor: toRequiredString(values.productColor),

      // Backend requires these.
      // productId2 is now hidden/internal, not branch code.
      productId2: toRequiredString(productId2, uuidv4()),
      productId3: toRequiredString(productId3, uuidv4()),

      productDiscount: toNumber(values.productDiscount),

      // Keep these only if your backend accepts/uses them.
      categoryId: values.categoryId,
      quantity: toNumber(values.quantity),
    };

    try {
      setLoading(true);

      await dispatch(updateProduct(payload)).unwrap();

      await dispatch(fetchAllProducts()).unwrap();

      message.success("Product updated successfully!");
      handleReset();
      onClose();
    } catch (err) {
      console.error("Error updating product:", err);

      if (typeof err === "string") {
        message.error(err);
      } else if (err?.errors) {
        const errorMessages = Object.entries(err.errors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n");

        message.error(`Validation failed: ${errorMessages}`);
      } else if (err?.title) {
        message.error(`Failed: ${err.title}`);
      } else {
        message.error("Failed to update product.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<Title level={4}>Update Product</Title>}
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={800}
      centered
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="Productid" style={{ display: "none" }}>
          <Input type="hidden" />
        </Form.Item>

        <Form.Item name="productId2" style={{ display: "none" }}>
          <Input type="hidden" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Product Name"
              name="productName"
              rules={[
                { required: true, message: "Please input the product name!" },
                {
                  min: 3,
                  message: "Product name must be at least 3 characters.",
                },
              ]}
            >
              <Input placeholder="Enter product name" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Price (₵)"
              name="price"
              rules={[
                { required: true, message: "Please input the price!" },
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

          <Col span={6}>
            <Form.Item
              label="Old Price (₵)"
              name="oldPrice"
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
              label="Discount (₵)"
              name="productDiscount"
              rules={[
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: "Please enter a valid discount.",
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
              label="Quantity"
              name="quantity"
              rules={[
                { required: true, message: "Please enter the quantity!" },
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
              label="Color"
              name="productColor"
              rules={[{ required: true, message: "Please input a color!" }]}
            >
              <Input placeholder="Enter product color" size="large" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="Tag"
              name="tag"
              rules={[{ required: true, message: "Please input a tag!" }]}
            >
              <Input placeholder="e.g., Featured, New" size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="MPN"
              name="productId3"
              tooltip="Manufacturer Part Number. Auto-generated if empty."
            >
              <Input placeholder="Enter MPN" size="large" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Please select a status!" }]}
            >
              <Select placeholder="Select status" size="large">
                <Option value="1">In Stock</Option>
                <Option value="0">Out of Stock</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item
          label="Description"
          name="description"
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
            autoSize={{ minRows: 4, maxRows: 6 }}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Brand"
              name="brandId"
              rules={[{ required: true, message: "Please select a brand!" }]}
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
              label="Showroom"
              name="showRoomId"
              rules={[
                { required: true, message: "Please select a showroom!" },
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
                {filteredShowrooms.map((showroom) => {
                  const id = showroom.showRoomId ?? showroom.showRoomID;

                  return (
                    <Option key={id} value={id}>
                      {showroom.showRoomName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Category"
              name="categoryId"
              rules={[
                { required: true, message: "Please select a category!" },
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

        <Divider />

        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button size="large" onClick={handleModalClose} disabled={loading}>
              Cancel
            </Button>

            <Button
              htmlType="submit"
              type="primary"
              loading={loading}
              size="large"
              style={{
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
              }}
            >
              Update Product
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

UpdateProduct.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  product: PropTypes.object,
};

UpdateProduct.defaultProps = {
  product: {},
};

export default UpdateProduct;