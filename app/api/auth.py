from fastapi import APIRouter, Depends, HTTPException, Form
from app.api.dependencies import authenticate
from app.models.user import UserModel
from app.core import security
import httpx


router_auth = APIRouter()
user_model = UserModel()

EXTERNAL_LOGIN_API = "https://id.asgl.net.vn/api/auth/login"

@router_auth.post("/register")
async def register(
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    address: str = Form(None),
    full_name: str = Form(None)
):
    try:
        user_id = user_model.create_user(
            username=username,
            password=password,
            email=email,
            phone=phone,
            address=address,
            full_name=full_name
        )
        return {
            "message": "User registered successfully",
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_auth.post("/login")
async def login(
    username: str = Form(...),
    password: str = Form(...)
):
    """
    Xác thực người dùng thông qua API bên ngoài và đồng bộ dữ liệu với hệ thống
    """
    try:
        # Kiểm tra xem người dùng đã tồn tại trong hệ thống chưa
        if not user_model.verify_password(username, password):
            # Gửi yêu cầu đến API bên ngoài
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    EXTERNAL_LOGIN_API,
                    data={
                        "login": username,
                        "password": password
                    }
                )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Lỗi kết nối với hệ thống xác thực")
            response_data = response.json()

            # Kiểm tra xác thực thành công
            if not response_data.get("success"):
                raise HTTPException(status_code=401, detail=response_data.get("message", "Thông tin đăng nhập không hợp lệ"))

            # Lấy thông tin từ phản hồi API
            auth_data = response_data.get("data", {})
            token = auth_data.get("token")
            user_info = auth_data.get("user", {})


            # Kiểm tra xem user đã tồn tại trong hệ thống chưa
            local_user = user_model.get_by_username(user_info.get("username"))

            if not local_user:
                user_id = user_model.create_user(
                    username=user_info.get("username"),
                    password=security.password_hash(password=password),  # Tạo mật khẩu ngẫu nhiên, không dùng để đăng nhập
                    email=user_info.get("email", ""),
                    phone=user_info.get("mobile_phone", ""),
                    full_name=user_info.get("full_name", ""),
                    role_id=3  # Role ID mặc định, điều chỉnh theo hệ thống của bạn
                )
                local_user = user_model.get_by_username(user_info.get("username"))
            else:
                # Cập nhật thông tin người dùng nếu cần
                user_model.update_user(
                    user_id=local_user["id"],
                    email=user_info.get("email", local_user["email"]),
                    phone=user_info.get("mobile_phone", local_user["phone"]),
                    full_name=user_info.get("full_name", local_user["full_name"]),
                    role_id=local_user["role_id"]  # Giữ nguyên role trong hệ thống
                )
                local_user = user_model.get_by_username(user_info.get("username"))

            internal_token = security.create_access_token(data={"sub": local_user["username"]})
            

            return {
                "message": "Login successful",
                "user": local_user,
                "token": internal_token
            }
        else:
            user = user_model.get_by_username(username)
            token = security.create_access_token(data={"sub": user["username"]})
            return {
                "message": "Login successful",
                "user": user,
                "token": token
            }
    except HTTPException as e:
        raise e  
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router_auth.get("/me")
async def get_me(
    current_user: str = Depends(authenticate)
):
    """
    Lấy thông tin người dùng hiện tại
    """
    try:
        user = user_model.get_by_username(current_user)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "message": "User retrieved successfully",
            "data": user
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_auth.post("/forgot-password")
async def forgot_password(
    username: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...)
):
    try: 
        user = user_model.get_by_usename_email_phone(username, email, phone)
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        user_id = user['id']

        user_model.update_password(user_id, password)
        
        return {
            "message": "Password updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router_auth.post("/create_admin_user")
async def create_admin_user():
    try:
        user_id = user_model.create_user(
            username='admin@admin.com',
            password='password',
            email='admin@example.com',
            phone='0984559557',
            address='NB',
            full_name="Admintrator",
            role="admin",
            role_id=1  # Role ID cho admin
        )
        return {
            "message": "Admin user created successfully",
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


